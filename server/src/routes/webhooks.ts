import { Router } from "express";
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
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.post(
  "/nafath",
  asyncHandler(async (req, res) => {
    const { transactionId, status, nationalId, verifiedAt } = req.body as {
      transactionId: string;
      status: "verified" | "rejected" | "expired";
      nationalId?: string;
      verifiedAt?: string;
    };

    await db.insert(integrationEvents).values({
      provider: "nafath",
      eventType: `verification.${status}`,
      referenceId: transactionId,
      payloadJson: req.body,
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
            nafathVerifiedAt: verifiedAt ? new Date(verifiedAt) : new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.referenceId, transactionId));

        await recordAudit({
          action: "webhook.nafath.verified",
          entityType: "user",
          entityId: user.id,
          after: { transactionId, status },
        });
      }
    }

    res.json({ received: true });
  })
);

router.post(
  "/nafith",
  asyncHandler(async (req, res) => {
    const { nafithReference, status, eventType } = req.body as {
      nafithReference: string;
      status: string;
      eventType: string;
    };

    await db.insert(integrationEvents).values({
      provider: "nafith",
      eventType: eventType ?? `sanad.${status}`,
      referenceId: nafithReference,
      payloadJson: req.body,
    });

    if (nafithReference) {
      const [sanad] = await db
        .select()
        .from(sanadRecords)
        .where(eq(sanadRecords.nafithReference, nafithReference))
        .limit(1);

      if (sanad) {
        const statusMap: Record<string, string> = {
          signed: "signed",
          executed: "executed",
          cancelled: "cancelled",
          discharged: "discharged",
        };

        const newStatus = statusMap[status];
        if (newStatus) {
          await db
            .update(sanadRecords)
            .set({
              status: newStatus as any,
              updatedAt: new Date(),
              ...(status === "signed" ? { signedAt: new Date() } : {}),
              ...(status === "executed" ? { executedAt: new Date() } : {}),
            })
            .where(eq(sanadRecords.id, sanad.id));
        }

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.referenceId, nafithReference));

        await recordAudit({
          action: `webhook.nafith.${status}`,
          entityType: "sanad",
          entityId: sanad.id,
          after: { nafithReference, status },
        });
      }
    }

    res.json({ received: true });
  })
);

router.post(
  "/payment",
  asyncHandler(async (req, res) => {
    const { transactionId, status, capturedAt, failureReason } = req.body as {
      transactionId: string;
      status: "captured" | "failed" | "refunded" | "chargeback";
      capturedAt?: string;
      failureReason?: string;
    };

    await db.insert(integrationEvents).values({
      provider: "payment_gateway",
      eventType: `payment.${status}`,
      referenceId: transactionId,
      payloadJson: req.body,
    });

    if (transactionId) {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.gatewayTransactionId, transactionId))
        .limit(1);

      if (payment) {
        await db
          .update(payments)
          .set({
            status: status as any,
            updatedAt: new Date(),
            ...(status === "captured"
              ? { capturedAt: capturedAt ? new Date(capturedAt) : new Date() }
              : {}),
            ...(status === "refunded" ? { refundedAt: new Date() } : {}),
            ...(status === "failed" ? { failureReason } : {}),
          })
          .where(eq(payments.id, payment.id));

        if (status === "captured" && payment.rentalId && payment.type === "rental_fee") {
          await db
            .update(rentals)
            .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
            .where(eq(rentals.id, payment.rentalId));
        }

        await db
          .update(integrationEvents)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(integrationEvents.referenceId, transactionId));

        await recordAudit({
          action: `webhook.payment.${status}`,
          entityType: "payment",
          entityId: payment.id,
          after: { transactionId, status },
        });
      }
    }

    res.json({ received: true });
  })
);

export default router;
