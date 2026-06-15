import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  integrationEvents,
  users,
  sanadRecords,
  payments,
  rentals,
} from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

async function logIntegrationEvent(
  provider: string,
  eventType: string,
  referenceId: string | null,
  payload: unknown
) {
  await db.insert(integrationEvents).values({
    provider,
    eventType,
    referenceId,
    payloadJson: payload as object,
    processed: false,
  });
}

router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const { transactionId, status, nationalId } = req.body as {
      transactionId: string;
      status: "completed" | "rejected" | "expired";
      nationalId?: string;
    };

    await logIntegrationEvent("nafath", `verification.${status}`, transactionId, req.body);

    if (status === "completed" && nationalId) {
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
            nationalId,
            kycStatus: "verified",
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.referenceId, transactionId));

        await recordAudit({
          action: "nafath.verification_completed",
          entityType: "user",
          entityId: user.id,
          after: { transactionId, nationalId },
        });
      }
    }

    res.json({ received: true });
  })
);

router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const { requestId, status, nafithReference, signedAt } = req.body as {
      requestId: string;
      status: "issued" | "signed" | "rejected" | "expired";
      nafithReference?: string;
      signedAt?: string;
    };

    await logIntegrationEvent("nafith", `sanad.${status}`, requestId, req.body);

    const [sanad] = await db
      .select()
      .from(sanadRecords)
      .where(eq(sanadRecords.nafithRequestId, requestId))
      .limit(1);

    if (sanad) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (status === "issued") {
        updates.status = "issued";
        updates.issuedAt = new Date();
        if (nafithReference) updates.nafithReference = nafithReference;
      } else if (status === "signed") {
        updates.status = "signed";
        updates.signedAt = signedAt ? new Date(signedAt) : new Date();
      } else if (status === "rejected" || status === "expired") {
        updates.status = "cancelled";
      }

      await db
        .update(sanadRecords)
        .set(updates as any)
        .where(eq(sanadRecords.id, sanad.id));

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.referenceId, requestId));

      await recordAudit({
        action: `nafith.sanad_${status}`,
        entityType: "sanad",
        entityId: sanad.id,
        after: { requestId, status, nafithReference },
      });
    }

    res.json({ received: true });
  })
);

router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const { transactionId, status, amount, currency } = req.body as {
      transactionId: string;
      status: "captured" | "failed" | "refunded" | "chargeback";
      amount?: number;
      currency?: string;
    };

    await logIntegrationEvent("payment_gateway", `payment.${status}`, transactionId, req.body);

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.gatewayTransactionId, transactionId))
      .limit(1);

    if (payment) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (status === "captured") {
        updates.status = "captured";
        updates.capturedAt = new Date();

        if (payment.rentalId) {
          const [rental] = await db
            .select()
            .from(rentals)
            .where(eq(rentals.id, payment.rentalId))
            .limit(1);
          if (rental && rental.status === "pending_payment") {
            await db
              .update(rentals)
              .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
              .where(eq(rentals.id, rental.id));
          }
        }
      } else if (status === "failed") {
        updates.status = "failed";
        updates.failureReason = "Payment gateway reported failure";
      } else if (status === "refunded") {
        updates.status = "refunded";
        updates.refundedAt = new Date();
      } else if (status === "chargeback") {
        updates.status = "chargeback";
      }

      await db
        .update(payments)
        .set(updates as any)
        .where(eq(payments.id, payment.id));

      await db
        .update(integrationEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(integrationEvents.referenceId, transactionId));

      await recordAudit({
        action: `payment.webhook_${status}`,
        entityType: "payment",
        entityId: payment.id,
        after: { transactionId, status },
      });
    }

    res.json({ received: true });
  })
);

export default router;
