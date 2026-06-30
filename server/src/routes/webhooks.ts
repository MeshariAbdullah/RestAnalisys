/**
 * Webhook receiver routes — external system callbacks.
 *
 * These endpoints are NOT authenticated (webhooks come from third-party
 * systems). Each handler:
 *  1. Logs the raw payload to `integration_events`.
 *  2. Processes the event (updates relevant domain tables).
 *  3. Returns 200 `{ received: true }` to the caller.
 *  4. On processing error, marks the integration event with an error message.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  integrationEvents,
  users,
  sanadRecords,
  payments,
  shipments,
} from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// ── Nafath verification callback ───────────────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      transactionId?: string;
      nationalId?: string;
      status?: string;
      [key: string]: unknown;
    };

    // Log the raw event
    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafath",
        eventType: payload.status ?? "callback",
        referenceId: payload.transactionId ?? null,
        payloadJson: payload as object,
      })
      .returning();

    try {
      if (payload.status === "verified" && payload.nationalId) {
        await db
          .update(users)
          .set({
            nafathVerified: true,
            nafathVerifiedAt: new Date(),
            nafathTransactionId: payload.transactionId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(users.nationalId, payload.nationalId));
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    } catch (err) {
      await db
        .update(integrationEvents)
        .set({
          error: err instanceof Error ? err.message : String(err),
          processedAt: new Date(),
        })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true });
  })
);

// ── Nafith Sanad status update ─────────────────────────────────────────────
router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      nafithReference?: string;
      requestId?: string;
      status?: string;
      [key: string]: unknown;
    };

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafith",
        eventType: payload.status ?? "callback",
        referenceId: payload.nafithReference ?? payload.requestId ?? null,
        payloadJson: payload as object,
      })
      .returning();

    try {
      if (payload.status && payload.nafithReference) {
        const statusMap: Record<string, typeof sanadRecords.$inferSelect["status"]> = {
          issued: "issued",
          signed: "signed",
          active: "active",
          matured: "matured",
          discharged: "discharged",
          under_execution: "under_execution",
          executed: "executed",
          cancelled: "cancelled",
        };

        const mappedStatus = statusMap[payload.status];
        if (mappedStatus) {
          await db
            .update(sanadRecords)
            .set({
              status: mappedStatus,
              updatedAt: new Date(),
            })
            .where(eq(sanadRecords.nafithReference, payload.nafithReference));
        }
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    } catch (err) {
      await db
        .update(integrationEvents)
        .set({
          error: err instanceof Error ? err.message : String(err),
          processedAt: new Date(),
        })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true });
  })
);

// ── Payment gateway callback ───────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      transactionId?: string;
      status?: string;
      failureReason?: string;
      [key: string]: unknown;
    };

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "hyperpay",
        eventType: payload.status ?? "callback",
        referenceId: payload.transactionId ?? null,
        payloadJson: payload as object,
      })
      .returning();

    try {
      if (payload.status && payload.transactionId) {
        const statusMap: Record<string, typeof payments.$inferSelect["status"]> = {
          authorized: "authorized",
          captured: "captured",
          failed: "failed",
          refunded: "refunded",
          chargeback: "chargeback",
        };

        const mappedStatus = statusMap[payload.status];
        if (mappedStatus) {
          const updateData: Record<string, unknown> = {
            status: mappedStatus,
            gatewayRawJson: payload as object,
            updatedAt: new Date(),
          };

          if (mappedStatus === "captured") {
            updateData.capturedAt = new Date();
          } else if (mappedStatus === "refunded") {
            updateData.refundedAt = new Date();
          } else if (mappedStatus === "failed") {
            updateData.failureReason = payload.failureReason ?? null;
          }

          await db
            .update(payments)
            .set(updateData)
            .where(eq(payments.gatewayTransactionId, payload.transactionId));
        }
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    } catch (err) {
      await db
        .update(integrationEvents)
        .set({
          error: err instanceof Error ? err.message : String(err),
          processedAt: new Date(),
        })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true });
  })
);

// ── Courier delivery update ────────────────────────────────────────────────
router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const payload = req.body as {
      trackingNumber?: string;
      status?: string;
      courier?: string;
      [key: string]: unknown;
    };

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "courier",
        eventType: payload.status ?? "callback",
        referenceId: payload.trackingNumber ?? null,
        payloadJson: payload as object,
      })
      .returning();

    try {
      if (payload.status && payload.trackingNumber) {
        const statusMap: Record<string, typeof shipments.$inferSelect["status"]> = {
          picked_up: "picked_up",
          in_transit: "in_transit",
          delivered: "delivered",
          failed: "failed",
          returned: "returned",
        };

        const mappedStatus = statusMap[payload.status];
        if (mappedStatus) {
          const updateData: Record<string, unknown> = {
            status: mappedStatus,
            updatedAt: new Date(),
          };

          if (mappedStatus === "picked_up") {
            updateData.pickedUpAt = new Date();
          } else if (mappedStatus === "delivered") {
            updateData.deliveredAt = new Date();
          }

          await db
            .update(shipments)
            .set(updateData)
            .where(eq(shipments.trackingNumber, payload.trackingNumber));
        }
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    } catch (err) {
      await db
        .update(integrationEvents)
        .set({
          error: err instanceof Error ? err.message : String(err),
          processedAt: new Date(),
        })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true });
  })
);

export default router;
