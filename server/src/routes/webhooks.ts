/**
 * Webhook handlers for external service callbacks.
 *
 * These endpoints are called by third-party services (payment gateways,
 * courier providers, Nafith/Nafath) to notify us of status changes.
 *
 * Security: each webhook validates the provider's signature/token before
 * processing. In dev mode, all webhooks are accepted.
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  payments,
  rentals,
  shipments,
  sanadRecords,
  legalCommitments,
  integrationEvents,
  operationalAlerts,
  users,
} from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";

function verifyWebhookToken(req: { headers: Record<string, unknown>; body: unknown }, provider: string): boolean {
  if (isDev) return true;
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  if (!secret) return false;
  const token = req.headers["x-webhook-token"] ?? req.headers["x-webhook-signature"];
  return token === secret;
}

// ── Payment gateway callback ────────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    if (!verifyWebhookToken(req, "PAYMENT")) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { transactionId, status, gatewayReference, metadata } = req.body as {
      transactionId: string;
      status: "captured" | "failed" | "refunded" | "chargeback";
      gatewayReference?: string;
      metadata?: Record<string, unknown>;
    };

    // Log the event
    await db.insert(integrationEvents).values({
      provider: "payment_gateway",
      eventType: `payment.${status}`,
      referenceId: transactionId,
      payloadJson: req.body as object,
    });

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.gatewayTransactionId, transactionId))
      .limit(1);

    if (!payment) {
      res.status(200).json({ ok: true, message: "Payment not found, event logged" });
      return;
    }

    if (status === "captured") {
      await db
        .update(payments)
        .set({ status: "captured", capturedAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.id, payment.id));

      // Confirm the rental if this was the rental_fee payment
      if (payment.rentalId && payment.type === "rental_fee") {
        await db
          .update(rentals)
          .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
          .where(eq(rentals.id, payment.rentalId));
      }
    } else if (status === "failed") {
      await db
        .update(payments)
        .set({ status: "failed", failureReason: "Gateway reported failure", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    } else if (status === "refunded") {
      await db
        .update(payments)
        .set({ status: "refunded", refundedAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    } else if (status === "chargeback") {
      await db
        .update(payments)
        .set({ status: "chargeback", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));

      // Create a critical alert for chargebacks
      await db.insert(operationalAlerts).values({
        type: "payment_chargeback",
        severity: "critical",
        subjectType: "payment",
        subjectId: payment.id,
        message: `Chargeback received for payment #${payment.id} (${transactionId}).`,
        payloadJson: req.body as object,
      });
    }

    await recordAudit({
      action: `webhook.payment.${status}`,
      entityType: "payment",
      entityId: payment.id,
      after: { transactionId, status, gatewayReference },
    });

    res.json({ ok: true });
  })
);

// ── Courier / shipment tracking callback ────────────────────────────────────
router.post(
  "/courier",
  asyncHandler(async (req, res) => {
    if (!verifyWebhookToken(req, "COURIER")) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { trackingNumber, status, timestamp, details } = req.body as {
      trackingNumber: string;
      status: "picked_up" | "in_transit" | "delivered" | "failed" | "returned";
      timestamp?: string;
      details?: string;
    };

    await db.insert(integrationEvents).values({
      provider: "courier",
      eventType: `shipment.${status}`,
      referenceId: trackingNumber,
      payloadJson: req.body as object,
    });

    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.trackingNumber, trackingNumber))
      .limit(1);

    if (!shipment) {
      res.status(200).json({ ok: true, message: "Shipment not found, event logged" });
      return;
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    await db
      .update(shipments)
      .set({
        status,
        pickedUpAt: status === "picked_up" ? now : undefined,
        deliveredAt: status === "delivered" ? now : undefined,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipment.id));

    // If delivered and it's a platform_to_renter shipment, update rental
    if (status === "delivered" && shipment.rentalId && shipment.direction === "platform_to_renter") {
      await db
        .update(rentals)
        .set({ status: "active", deliveredAt: now, updatedAt: new Date() })
        .where(
          and(eq(rentals.id, shipment.rentalId), eq(rentals.status, "out_for_delivery"))
        );
    }

    // If delivered and it's a renter_to_platform shipment, trigger return inspection
    if (status === "delivered" && shipment.rentalId && shipment.direction === "renter_to_platform") {
      await db
        .update(rentals)
        .set({ status: "under_inspection", returnedAt: now, updatedAt: new Date() })
        .where(
          and(eq(rentals.id, shipment.rentalId), eq(rentals.status, "return_in_transit"))
        );
    }

    // Alert on failed deliveries
    if (status === "failed") {
      await db.insert(operationalAlerts).values({
        type: "shipment_failed",
        severity: "high",
        subjectType: "shipment",
        subjectId: shipment.id,
        message: `Shipment ${trackingNumber} delivery failed. ${details ?? ""}`.trim(),
        payloadJson: req.body as object,
      });
    }

    await recordAudit({
      action: `webhook.courier.${status}`,
      entityType: "shipment",
      entityId: shipment.id,
      after: { trackingNumber, status },
    });

    res.json({ ok: true });
  })
);

// ── Nafith (Sanad execution completion) ─────────────────────────────────────
router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    if (!verifyWebhookToken(req, "NAFITH")) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { nafithReference, eventType, caseNumber, executionStatus, details } = req.body as {
      nafithReference: string;
      eventType: "sanad.signed" | "sanad.executed" | "sanad.cancelled";
      caseNumber?: string;
      executionStatus?: string;
      details?: Record<string, unknown>;
    };

    await db.insert(integrationEvents).values({
      provider: "nafith",
      eventType,
      referenceId: nafithReference,
      payloadJson: req.body as object,
    });

    const [sanad] = await db
      .select()
      .from(sanadRecords)
      .where(eq(sanadRecords.nafithReference, nafithReference))
      .limit(1);

    if (!sanad) {
      res.status(200).json({ ok: true, message: "Sanad not found, event logged" });
      return;
    }

    if (eventType === "sanad.signed") {
      await db
        .update(sanadRecords)
        .set({ status: "signed", signedAt: new Date(), updatedAt: new Date() })
        .where(eq(sanadRecords.id, sanad.id));
    } else if (eventType === "sanad.executed") {
      await db
        .update(sanadRecords)
        .set({
          status: "executed",
          executedAt: new Date(),
          executionCaseNumber: caseNumber ?? null,
          updatedAt: new Date(),
        })
        .where(eq(sanadRecords.id, sanad.id));

      // Update the legal commitment to breached
      await db
        .update(legalCommitments)
        .set({ status: "breached", breachedAt: new Date(), updatedAt: new Date() })
        .where(eq(legalCommitments.id, sanad.legalCommitmentId));
    } else if (eventType === "sanad.cancelled") {
      await db
        .update(sanadRecords)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(sanadRecords.id, sanad.id));
    }

    await recordAudit({
      action: `webhook.nafith.${eventType}`,
      entityType: "sanad",
      entityId: sanad.id,
      after: { nafithReference, eventType, caseNumber },
    });

    res.json({ ok: true });
  })
);

// ── Nafath (identity verification callback) ─────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    if (!verifyWebhookToken(req, "NAFATH")) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { transactionId, status, nationalId } = req.body as {
      transactionId: string;
      status: "verified" | "rejected" | "expired";
      nationalId?: string;
    };

    await db.insert(integrationEvents).values({
      provider: "nafath",
      eventType: `identity.${status}`,
      referenceId: transactionId,
      payloadJson: req.body as object,
    });

    if (status === "verified" && nationalId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.nafathTransactionId, transactionId))
        .limit(1);

      if (user) {
        await db
          .update(users)
          .set({
            nafathVerified: true,
            nafathVerifiedAt: new Date(),
            kycStatus: "verified",
            nationalId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        await recordAudit({
          action: "webhook.nafath.verified",
          entityType: "user",
          entityId: user.id,
          after: { transactionId, status },
        });
      }
    }

    res.json({ ok: true });
  })
);

export default router;
