import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db/index.js";
import {
  integrationEvents,
  users,
  sanadRecords,
  payments,
  rentals,
  legalCommitments,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const NAFATH_WEBHOOK_SECRET = process.env.NAFATH_WEBHOOK_SECRET ?? "";
const NAFITH_WEBHOOK_SECRET = process.env.NAFITH_WEBHOOK_SECRET ?? "";
const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? "";

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true; // dev mode: skip verification
  const computed = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

// ── Nafath verification callback ──────────────────────────────────────────
router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const signature = (req.headers["x-nafath-signature"] as string) ?? "";
    const rawBody = JSON.stringify(req.body);

    if (!verifyHmac(rawBody, signature, NAFATH_WEBHOOK_SECRET)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body as {
      eventType: string;
      transactionId: string;
      nationalId?: string;
      status: "verified" | "rejected" | "expired";
      fullName?: string;
      dateOfBirth?: string;
    };

    const [logged] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafath",
        eventType: event.eventType,
        referenceId: event.transactionId,
        payloadJson: event as unknown as object,
      })
      .returning();

    if (event.eventType === "identity.verified" && event.nationalId) {
      await db
        .update(users)
        .set({
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          nafathTransactionId: event.transactionId,
          kycStatus: "verified",
          updatedAt: new Date(),
        })
        .where(eq(users.nationalId, event.nationalId));

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, logged.id));
    }

    if (event.eventType === "document.signed" && event.transactionId) {
      await db
        .update(legalCommitments)
        .set({
          status: "signed",
          signedAt: new Date(),
          nafathSignTransactionId: event.transactionId,
          updatedAt: new Date(),
        })
        .where(eq(legalCommitments.nafathSignTransactionId, event.transactionId));

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.id, logged.id));
    }

    res.json({ received: true, eventId: logged.id });
  })
);

// ── Nafith Sanad status callback ──────────────────────────────────────────
router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const signature = (req.headers["x-nafith-signature"] as string) ?? "";
    const rawBody = JSON.stringify(req.body);

    if (!verifyHmac(rawBody, signature, NAFITH_WEBHOOK_SECRET)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body as {
      eventType: string;
      nafithReference: string;
      status: string;
      executionCaseNumber?: string;
    };

    const [logged] = await db
      .insert(integrationEvents)
      .values({
        provider: "nafith",
        eventType: event.eventType,
        referenceId: event.nafithReference,
        payloadJson: event as unknown as object,
      })
      .returning();

    if (event.eventType === "sanad.signed") {
      await db
        .update(sanadRecords)
        .set({ status: "signed", signedAt: new Date(), updatedAt: new Date() })
        .where(eq(sanadRecords.nafithReference, event.nafithReference));
    }

    if (event.eventType === "sanad.discharged") {
      await db
        .update(sanadRecords)
        .set({ status: "discharged", updatedAt: new Date() })
        .where(eq(sanadRecords.nafithReference, event.nafithReference));
    }

    if (event.eventType === "sanad.executed") {
      await db
        .update(sanadRecords)
        .set({
          status: "executed",
          executedAt: new Date(),
          executionCaseNumber: event.executionCaseNumber ?? null,
          updatedAt: new Date(),
        })
        .where(eq(sanadRecords.nafithReference, event.nafithReference));
    }

    await db
      .update(integrationEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(integrationEvents.id, logged.id));

    res.json({ received: true, eventId: logged.id });
  })
);

// ── Payment gateway callback ──────────────────────────────────────────────
router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const signature = (req.headers["x-payment-signature"] as string) ?? "";
    const rawBody = JSON.stringify(req.body);

    if (!verifyHmac(rawBody, signature, PAYMENT_WEBHOOK_SECRET)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body as {
      eventType: string;
      transactionId: string;
      status: "captured" | "failed" | "refunded" | "chargeback";
      amountHalalas?: number;
    };

    const [logged] = await db
      .insert(integrationEvents)
      .values({
        provider: "payment_gateway",
        eventType: event.eventType,
        referenceId: event.transactionId,
        payloadJson: event as unknown as object,
      })
      .returning();

    if (event.eventType === "payment.captured") {
      await db
        .update(payments)
        .set({
          status: "captured",
          capturedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.gatewayTransactionId, event.transactionId));
    }

    if (event.eventType === "payment.failed") {
      await db
        .update(payments)
        .set({
          status: "failed",
          failureReason: "Gateway reported failure",
          updatedAt: new Date(),
        })
        .where(eq(payments.gatewayTransactionId, event.transactionId));
    }

    if (event.eventType === "payment.refunded") {
      await db
        .update(payments)
        .set({
          status: "refunded",
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.gatewayTransactionId, event.transactionId));
    }

    if (event.eventType === "payment.chargeback") {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayTransactionId, event.transactionId))
        .limit(1);

      if (payment) {
        await db
          .update(payments)
          .set({ status: "chargeback", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        if (payment.rentalId) {
          await db
            .update(rentals)
            .set({ status: "in_dispute", updatedAt: new Date() })
            .where(eq(rentals.id, payment.rentalId));
        }
      }
    }

    await db
      .update(integrationEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(integrationEvents.id, logged.id));

    res.json({ received: true, eventId: logged.id });
  })
);

export default router;
