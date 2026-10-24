/**
 * Webhook receiver routes for third-party integration callbacks.
 *
 * All incoming payloads are stored in `integration_events` before processing,
 * creating an immutable audit trail of external interactions.
 *
 * POST /api/webhooks/nafath    — Nafath identity verification callbacks
 * POST /api/webhooks/nafith    — Nafith Sanad status updates
 * POST /api/webhooks/payment   — Payment gateway notifications (HyperPay, etc.)
 * POST /api/webhooks/courier   — Courier delivery status updates
 */

import { Router } from "express";
import { db } from "../db/index.js";
import { integrationEvents, users, sanadRecords, payments, shipments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

async function storeEvent(provider: string, eventType: string, referenceId: string | null, payload: unknown): Promise<number> {
  const [row] = await db
    .insert(integrationEvents)
    .values({
      provider,
      eventType,
      referenceId,
      payloadJson: payload as object,
    })
    .returning();
  return row.id;
}

async function markProcessed(eventId: number, error?: string): Promise<void> {
  await db
    .update(integrationEvents)
    .set({
      processed: true,
      processedAt: new Date(),
      error: error ?? null,
    })
    .where(eq(integrationEvents.id, eventId));
}

// ── Nafath identity verification callback ────────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      transactionId?: string;
      status?: string;
      nationalId?: string;
    };

    const eventId = await storeEvent(
      "nafath",
      payload.status ?? "unknown",
      payload.transactionId ?? null,
      payload
    );

    try {
      if (payload.status === "COMPLETED" && payload.transactionId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.nafathTransactionId, payload.transactionId))
          .limit(1);

        if (user) {
          await db
            .update(users)
            .set({
              nafathVerified: true,
              nafathVerifiedAt: new Date(),
              kycStatus: "verified",
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
        }
      }

      await markProcessed(eventId);
      res.json({ received: true, eventId });
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
      throw err;
    }
  })
);

// ── Nafith Sanad status callback ─────────────────────────────────────────────
router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      nafithReference?: string;
      status?: string;
      executionCaseNumber?: string;
    };

    const eventId = await storeEvent(
      "nafith",
      payload.status ?? "unknown",
      payload.nafithReference ?? null,
      payload
    );

    try {
      if (payload.nafithReference && payload.status) {
        const [sanad] = await db
          .select()
          .from(sanadRecords)
          .where(eq(sanadRecords.nafithReference, payload.nafithReference))
          .limit(1);

        if (sanad) {
          const statusMap: Record<string, string> = {
            SIGNED: "signed",
            ACTIVE: "active",
            MATURED: "matured",
            DISCHARGED: "discharged",
            UNDER_EXECUTION: "under_execution",
            EXECUTED: "executed",
            CANCELLED: "cancelled",
          };

          const newStatus = statusMap[payload.status];
          if (newStatus) {
            const updates: Record<string, unknown> = {
              status: newStatus,
              updatedAt: new Date(),
              rawResponseJson: payload,
            };

            if (payload.status === "SIGNED") {
              updates.signedAt = new Date();
            }
            if (payload.status === "EXECUTED") {
              updates.executedAt = new Date();
              updates.executionCaseNumber = payload.executionCaseNumber;
            }

            await db
              .update(sanadRecords)
              .set(updates as typeof sanadRecords.$inferInsert)
              .where(eq(sanadRecords.id, sanad.id));
          }
        }
      }

      await markProcessed(eventId);
      res.json({ received: true, eventId });
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
      throw err;
    }
  })
);

// ── Payment gateway callback ─────────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      transactionId?: string;
      status?: string;
      amount?: number;
      currency?: string;
    };

    const eventId = await storeEvent(
      "payment",
      payload.status ?? "unknown",
      payload.transactionId ?? null,
      payload
    );

    try {
      if (payload.transactionId && payload.status) {
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.gatewayTransactionId, payload.transactionId))
          .limit(1);

        if (payment) {
          const statusMap: Record<string, string> = {
            CAPTURED: "captured",
            AUTHORIZED: "authorized",
            FAILED: "failed",
            REFUNDED: "refunded",
            CHARGEBACK: "chargeback",
          };

          const newStatus = statusMap[payload.status];
          if (newStatus) {
            const updates: Record<string, unknown> = {
              status: newStatus,
              gatewayRawJson: payload,
              updatedAt: new Date(),
            };

            if (payload.status === "CAPTURED") {
              updates.capturedAt = new Date();
            }
            if (payload.status === "REFUNDED") {
              updates.refundedAt = new Date();
            }
            if (payload.status === "FAILED") {
              updates.failureReason = "Gateway reported failure";
            }

            await db
              .update(payments)
              .set(updates as typeof payments.$inferInsert)
              .where(eq(payments.id, payment.id));
          }
        }
      }

      await markProcessed(eventId);
      res.json({ received: true, eventId });
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
      throw err;
    }
  })
);

// ── Courier delivery status callback ─────────────────────────────────────────
router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      trackingNumber?: string;
      status?: string;
      deliveredAt?: string;
    };

    const eventId = await storeEvent(
      "courier",
      payload.status ?? "unknown",
      payload.trackingNumber ?? null,
      payload
    );

    try {
      if (payload.trackingNumber && payload.status) {
        const [shipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.trackingNumber, payload.trackingNumber))
          .limit(1);

        if (shipment) {
          const statusMap: Record<string, string> = {
            PICKED_UP: "picked_up",
            IN_TRANSIT: "in_transit",
            DELIVERED: "delivered",
            FAILED: "failed",
            RETURNED: "returned",
          };

          const newStatus = statusMap[payload.status];
          if (newStatus) {
            const updates: Record<string, unknown> = {
              status: newStatus,
              updatedAt: new Date(),
            };

            if (payload.status === "PICKED_UP") {
              updates.pickedUpAt = new Date();
            }
            if (payload.status === "DELIVERED") {
              updates.deliveredAt = payload.deliveredAt
                ? new Date(payload.deliveredAt)
                : new Date();
            }

            await db
              .update(shipments)
              .set(updates as typeof shipments.$inferInsert)
              .where(eq(shipments.id, shipment.id));
          }
        }
      }

      await markProcessed(eventId);
      res.json({ received: true, eventId });
    } catch (err) {
      await markProcessed(eventId, (err as Error).message);
      throw err;
    }
  })
);

export default router;
