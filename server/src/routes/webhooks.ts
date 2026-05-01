import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { integrationEvents, payments, rentals, shipments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notifyPaymentCaptured } from "../services/notificationService.js";

const router = Router();

function verifyWebhookSignature(provider: string, req: Request): boolean {
  // In production, verify HMAC signature from each provider
  // For now, check a shared secret header
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  if (!secret) return true; // dev mode — accept all
  const signature = req.headers["x-webhook-signature"] as string;
  return signature === secret;
}

// ── Payment gateway callback ────────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifyWebhookSignature("payment", req)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { transactionId, status, amount, metadata } = req.body as {
      transactionId: string;
      status: "captured" | "failed" | "refunded" | "chargeback";
      amount?: number;
      metadata?: { rentalId?: number; paymentId?: number };
    };

    await db.insert(integrationEvents).values({
      provider: "payment_gateway",
      eventType: `payment.${status}`,
      referenceId: transactionId,
      payloadJson: req.body,
    });

    if (metadata?.paymentId) {
      const newStatus = status === "captured" ? "captured"
        : status === "failed" ? "failed"
        : status === "refunded" ? "refunded"
        : "chargeback";

      await db
        .update(payments)
        .set({
          status: newStatus,
          ...(status === "captured" ? { capturedAt: new Date() } : {}),
          ...(status === "refunded" ? { refundedAt: new Date() } : {}),
          ...(status === "failed" ? { failureReason: "Gateway rejection" } : {}),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, metadata.paymentId));

      if (status === "captured" && metadata.rentalId) {
        const [rental] = await db
          .select()
          .from(rentals)
          .where(eq(rentals.id, metadata.rentalId))
          .limit(1);

        if (rental && rental.status === "pending_payment") {
          await db
            .update(rentals)
            .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
            .where(eq(rentals.id, metadata.rentalId));

          await notifyPaymentCaptured(
            rental.renterId,
            rental.reference,
            rental.totalPayableHalalas,
            transactionId
          ).catch(() => {});
        }
      }
    }

    res.json({ received: true });
  })
);

// ── Courier tracking callback ───────────────────────────────────────────────
router.post(
  "/courier",
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifyWebhookSignature("courier", req)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { trackingNumber, status, timestamp } = req.body as {
      trackingNumber: string;
      status: "picked_up" | "in_transit" | "delivered" | "failed" | "returned";
      timestamp?: string;
    };

    await db.insert(integrationEvents).values({
      provider: "courier",
      eventType: `shipment.${status}`,
      referenceId: trackingNumber,
      payloadJson: req.body,
    });

    const shipmentRows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.trackingNumber, trackingNumber))
      .limit(1);

    if (shipmentRows.length > 0) {
      const ts = timestamp ? new Date(timestamp) : new Date();
      await db
        .update(shipments)
        .set({
          status,
          ...(status === "picked_up" ? { pickedUpAt: ts } : {}),
          ...(status === "delivered" ? { deliveredAt: ts } : {}),
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, shipmentRows[0].id));
    }

    res.json({ received: true });
  })
);

// ── Nafath identity verification callback ───────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req: Request, res: Response) => {
    if (!verifyWebhookSignature("nafath", req)) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    await db.insert(integrationEvents).values({
      provider: "nafath",
      eventType: "identity.callback",
      referenceId: req.body.transactionId,
      payloadJson: req.body,
    });

    // Nafath callback processing is handled by the auth route's
    // polling mechanism. This endpoint logs the event for auditing.

    res.json({ received: true });
  })
);

export default router;
