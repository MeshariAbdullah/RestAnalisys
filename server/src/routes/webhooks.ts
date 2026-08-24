import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  integrationEvents,
  users,
  rentals,
  payments,
  sanadRecords,
  shipments,
} from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();

router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const { transactionId, status, nationalId } = req.body;

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafath",
        eventType: status,
        referenceId: transactionId,
        payloadJson: req.body,
      })
      .returning();

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
        .where(eq(users.nationalId, nationalId));

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true, eventId: event.id });
  })
);

router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const { requestId, status, reference } = req.body;

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafith",
        eventType: status,
        referenceId: requestId,
        payloadJson: req.body,
      })
      .returning();

    if (requestId && status) {
      const [sanad] = await db
        .select()
        .from(sanadRecords)
        .where(eq(sanadRecords.nafithRequestId, requestId))
        .limit(1);

      if (sanad) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (status === "signed") {
          updateData.status = "signed";
          updateData.signedAt = new Date();
        } else if (status === "executed") {
          updateData.status = "executed";
          updateData.executedAt = new Date();
          if (reference) updateData.executionCaseNumber = reference;
        } else if (status === "discharged") {
          updateData.status = "discharged";
        }

        await db
          .update(sanadRecords)
          .set(updateData)
          .where(eq(sanadRecords.id, sanad.id));
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true, eventId: event.id });
  })
);

router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const { transactionId, status, amount } = req.body;

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "hyperpay",
        eventType: status,
        referenceId: transactionId,
        payloadJson: req.body,
      })
      .returning();

    if (transactionId && status) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayTransactionId, transactionId))
        .limit(1);

      if (payment) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (status === "captured") {
          updateData.status = "captured";
          updateData.capturedAt = new Date();
        } else if (status === "failed") {
          updateData.status = "failed";
          updateData.failureReason = req.body.reason ?? "Payment failed";
        } else if (status === "refunded") {
          updateData.status = "refunded";
          updateData.refundedAt = new Date();
        } else if (status === "chargeback") {
          updateData.status = "chargeback";
        }

        await db
          .update(payments)
          .set(updateData)
          .where(eq(payments.id, payment.id));
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true, eventId: event.id });
  })
);

router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const { trackingNumber, status } = req.body;

    const [event] = await db
      .insert(integrationEvents)
      .values({
        provider: "courier",
        eventType: status,
        referenceId: trackingNumber,
        payloadJson: req.body,
      })
      .returning();

    if (trackingNumber && status) {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.trackingNumber, trackingNumber))
        .limit(1);

      if (shipment) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (status === "picked_up") {
          updateData.status = "picked_up";
          updateData.pickedUpAt = new Date();
        } else if (status === "in_transit") {
          updateData.status = "in_transit";
        } else if (status === "delivered") {
          updateData.status = "delivered";
          updateData.deliveredAt = new Date();
        } else if (status === "failed") {
          updateData.status = "failed";
        }

        await db
          .update(shipments)
          .set(updateData)
          .where(eq(shipments.id, shipment.id));
      }

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, event.id));
    }

    res.json({ received: true, eventId: event.id });
  })
);

export default router;
