/**
 * Webhook routes — receive callbacks from third-party integrations.
 *
 * In production each provider's webhook should be verified (HMAC signature,
 * IP allowlist, etc.) before processing. The dev stubs accept any payload.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { integrationEvents, rentals, payments, sanadRecords, shipments } from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Payment gateway callback ────────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const { transactionId, status, gatewayReference, metadata } = req.body;

    await db.insert(integrationEvents).values({
      provider: "payment_gateway",
      eventType: `payment.${status}`,
      referenceId: transactionId,
      payloadJson: req.body,
    });

    if (transactionId && status) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayTransactionId, transactionId))
        .limit(1);

      if (payment) {
        const statusMap: Record<string, string> = {
          captured: "captured",
          failed: "failed",
          chargeback: "chargeback",
          refunded: "refunded",
        };
        const mappedStatus = statusMap[status];
        if (mappedStatus) {
          await db
            .update(payments)
            .set({
              status: mappedStatus as typeof payment.status,
              capturedAt: status === "captured" ? new Date() : payment.capturedAt,
              refundedAt: status === "refunded" ? new Date() : payment.refundedAt,
              failureReason: status === "failed" ? (metadata?.reason ?? "Gateway rejected") : payment.failureReason,
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));

          await recordAudit({
            action: `webhook.payment.${status}`,
            entityType: "payment",
            entityId: payment.id,
            before: { status: payment.status },
            after: { status: mappedStatus, gatewayReference },
          });
        }
      }
    }

    res.json({ received: true });
  })
);

// ── Nafath identity verification callback ───────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const { transactionId, status, nationalId, verifiedAt } = req.body;

    await db.insert(integrationEvents).values({
      provider: "nafath",
      eventType: `identity.${status}`,
      referenceId: transactionId,
      payloadJson: req.body,
    });

    await recordAudit({
      action: `webhook.nafath.${status}`,
      entityType: "user",
      after: { transactionId, nationalId, status },
    });

    res.json({ received: true });
  })
);

// ── Nafith (Sanad) status callback ──────────────────────────────────────────
router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const { nafithReference, status, executionCaseNumber } = req.body;

    await db.insert(integrationEvents).values({
      provider: "nafith",
      eventType: `sanad.${status}`,
      referenceId: nafithReference,
      payloadJson: req.body,
    });

    if (nafithReference && status) {
      const [sanad] = await db
        .select()
        .from(sanadRecords)
        .where(eq(sanadRecords.nafithReference, nafithReference))
        .limit(1);

      if (sanad) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (status === "signed") {
          updateData.status = "signed";
          updateData.signedAt = new Date();
        } else if (status === "executed") {
          updateData.status = "executed";
          updateData.executedAt = new Date();
          if (executionCaseNumber) updateData.executionCaseNumber = executionCaseNumber;
        } else if (status === "discharged") {
          updateData.status = "discharged";
        }

        await db
          .update(sanadRecords)
          .set(updateData)
          .where(eq(sanadRecords.id, sanad.id));

        await recordAudit({
          action: `webhook.nafith.${status}`,
          entityType: "sanad",
          entityId: sanad.id,
          before: { status: sanad.status },
          after: { status, nafithReference },
        });
      }
    }

    res.json({ received: true });
  })
);

// ── Courier tracking callback ───────────────────────────────────────────────
router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    const { trackingNumber, status, deliveredAt: deliveredAtStr, courier } = req.body;

    await db.insert(integrationEvents).values({
      provider: "courier",
      eventType: `shipment.${status}`,
      referenceId: trackingNumber,
      payloadJson: req.body,
    });

    if (trackingNumber && status) {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.trackingNumber, trackingNumber))
        .limit(1);

      if (shipment) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        const statusMap: Record<string, string> = {
          picked_up: "picked_up",
          in_transit: "in_transit",
          delivered: "delivered",
          failed: "failed",
          returned: "returned",
        };

        const mappedStatus = statusMap[status];
        if (mappedStatus) {
          updateData.status = mappedStatus;
          if (status === "picked_up") updateData.pickedUpAt = new Date();
          if (status === "delivered") updateData.deliveredAt = deliveredAtStr ? new Date(deliveredAtStr) : new Date();
        }

        await db
          .update(shipments)
          .set(updateData)
          .where(eq(shipments.id, shipment.id));

        await recordAudit({
          action: `webhook.courier.${status}`,
          entityType: "shipment",
          entityId: shipment.id,
          before: { status: shipment.status },
          after: { status: mappedStatus, trackingNumber },
        });
      }
    }

    res.json({ received: true });
  })
);

export default router;
