/**
 * Webhook receiver endpoints for third-party integrations.
 *
 * Each provider (Nafath, Nafith, payment gateway, courier) sends callbacks
 * here. We log the raw payload in `integration_events` and then dispatch
 * to the appropriate handler.
 *
 * In production these should verify HMAC signatures from the provider.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  integrationEvents,
  users,
  sanadRecords,
  payments,
  rentals,
  shipments,
} from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

type Provider = "nafath" | "nafith" | "hyperpay" | "zatca" | "courier";

async function logEvent(
  provider: Provider,
  eventType: string,
  referenceId: string | null,
  payload: unknown
): Promise<number> {
  const [row] = await db
    .insert(integrationEvents)
    .values({
      provider,
      eventType,
      referenceId,
      payloadJson: payload as object,
    })
    .returning({ id: integrationEvents.id });
  return row.id;
}

async function markProcessed(eventId: number, error?: string) {
  await db
    .update(integrationEvents)
    .set({
      processed: !error,
      processedAt: new Date(),
      error: error ?? null,
    })
    .where(eq(integrationEvents.id, eventId));
}

// ── Nafath verification callback ──────────────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const { transactionId, status, nationalId } = req.body as {
      transactionId: string;
      status: "verified" | "rejected" | "expired";
      nationalId?: string;
    };

    const eventId = await logEvent("nafath", `verification.${status}`, transactionId, req.body);

    try {
      if (status === "verified" && nationalId) {
        await db
          .update(users)
          .set({
            nafathVerified: true,
            nafathVerifiedAt: new Date(),
            nafathTransactionId: transactionId,
            kycStatus: "verified",
            updatedAt: new Date(),
          })
          .where(eq(users.nafathTransactionId, transactionId));
      }
      await markProcessed(eventId);
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
    }

    res.json({ received: true });
  })
);

// ── Nafith Sanad status callback ──────────────────────────────────────────
router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const { nafithReference, status, executionCaseNumber } = req.body as {
      nafithReference: string;
      status: string;
      executionCaseNumber?: string;
    };

    const eventId = await logEvent("nafith", `sanad.${status}`, nafithReference, req.body);

    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };
      if (status === "signed") updates.signedAt = new Date();
      if (status === "executed") {
        updates.executedAt = new Date();
        if (executionCaseNumber) updates.executionCaseNumber = executionCaseNumber;
      }

      await db
        .update(sanadRecords)
        .set(updates as any)
        .where(eq(sanadRecords.nafithReference, nafithReference));

      await markProcessed(eventId);
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
    }

    res.json({ received: true });
  })
);

// ── Payment gateway callback ──────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const { transactionId, status, failureReason } = req.body as {
      transactionId: string;
      status: "captured" | "failed" | "refunded" | "chargeback";
      failureReason?: string;
    };

    const eventId = await logEvent("hyperpay", `payment.${status}`, transactionId, req.body);

    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };
      if (status === "captured") updates.capturedAt = new Date();
      if (status === "refunded") updates.refundedAt = new Date();
      if (failureReason) updates.failureReason = failureReason;

      const [payment] = await db
        .update(payments)
        .set(updates as any)
        .where(eq(payments.gatewayTransactionId, transactionId))
        .returning();

      if (payment && status === "captured" && payment.rentalId) {
        await db
          .update(rentals)
          .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
          .where(eq(rentals.id, payment.rentalId));
      }

      await markProcessed(eventId);
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
    }

    res.json({ received: true });
  })
);

// ── Courier tracking callback ─────────────────────────────────────────────
router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const { trackingNumber, status } = req.body as {
      trackingNumber: string;
      status: "picked_up" | "in_transit" | "delivered" | "failed" | "returned";
    };

    const eventId = await logEvent("courier", `shipment.${status}`, trackingNumber, req.body);

    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };
      if (status === "picked_up") updates.pickedUpAt = new Date();
      if (status === "delivered") updates.deliveredAt = new Date();

      await db
        .update(shipments)
        .set(updates as any)
        .where(eq(shipments.trackingNumber, trackingNumber));

      await markProcessed(eventId);
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
    }

    res.json({ received: true });
  })
);

export default router;
