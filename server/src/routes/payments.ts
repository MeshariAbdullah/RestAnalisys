/**
 * Payment routes — capture rental payments, ZATCA e-invoicing, refunds, and
 * owner payouts.
 */

import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { payments, rentals, users, assets, payouts } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PaymentChargeSchema, PaymentRefundSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  NotFoundError,
  LegalStateError,
  ForbiddenError,
} from "../utils/errors.js";
import { chargeCard, refundPayment, generateZatcaInvoice } from "../services/paymentService.js";
import { computeOwnerPayout, formatHalalas } from "../utils/money.js";
import { notifyOwnerPayout } from "../services/notificationService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Renter: charge a rental (runs the gateway placeholder) ─────────────────
router.post(
  "/charge",
  authenticate,
  requirePermission("rental.create"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rentalId, paymentMethodToken } = PaymentChargeSchema.parse(req.body);

    const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.renterId !== req.user!.userId) throw new ForbiddenError();
    if (rental.status !== "pending_payment") {
      throw new LegalStateError(`Rental not awaiting payment (status=${rental.status})`);
    }

    const result = await chargeCard({
      amountHalalas: rental.totalPayableHalalas,
      description: `Rental ${rental.reference}`,
      rentalReference: rental.reference,
      renterUserId: req.user!.userId,
      paymentMethodToken,
    });

    const [payment] = await db
      .insert(payments)
      .values({
        rentalId: rental.id,
        userId: req.user!.userId,
        type: "rental_fee",
        status: result.status,
        amountHalalas: rental.totalPayableHalalas,
        gateway: result.gateway,
        gatewayTransactionId: result.transactionId,
        gatewayRawJson: result.raw as object,
        capturedAt: result.capturedAt ? new Date(result.capturedAt) : null,
      })
      .returning();

    // ZATCA e-invoice
    const [user] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    const invoice = await generateZatcaInvoice({
      paymentId: payment.id,
      rentalReference: rental.reference,
      customerName: user?.fullName ?? "Customer",
      lineItems: [
        {
          description: "Rental",
          amountHalalas: rental.rentalSubtotalHalalas,
          vatHalalas: 0,
        },
        {
          description: "Platform fee",
          amountHalalas: rental.platformFeeHalalas,
          vatHalalas: 0,
        },
        {
          description: "VAT 15%",
          amountHalalas: rental.vatHalalas,
          vatHalalas: rental.vatHalalas,
        },
      ],
      totalHalalas: rental.totalPayableHalalas,
    });

    await db
      .update(payments)
      .set({
        invoiceNumber: invoice.invoiceNumber,
        invoiceXmlUrl: invoice.invoiceXmlUrl,
        invoiceQrBase64: invoice.invoiceQrBase64,
        invoicedAt: new Date(invoice.invoicedAt),
      })
      .where(eq(payments.id, payment.id));

    // Move rental forward on successful capture
    if (result.status === "captured") {
      await db
        .update(rentals)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(rentals.id, rental.id));
    }

    await recordAudit({
      req,
      action: "payment.charge",
      entityType: "payment",
      entityId: payment.id,
      after: { payment, invoice },
    });

    res.json({ payment, invoice });
  })
);

// ── Admin: refund a payment ────────────────────────────────────────────────
router.post(
  "/refund",
  authenticate,
  requirePermission("payment.refund"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = PaymentRefundSchema.parse(req.body);
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);
    if (!payment) throw new NotFoundError("Payment");
    if (!payment.gatewayTransactionId)
      throw new LegalStateError("Payment has no gateway reference");

    const result = await refundPayment(
      payment.gatewayTransactionId,
      input.amountHalalas ?? payment.amountHalalas
    );

    const [updated] = await db
      .update(payments)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        failureReason: input.reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, input.paymentId))
      .returning();

    await recordAudit({
      req,
      action: "payment.refund",
      entityType: "payment",
      entityId: input.paymentId,
      after: { updated, result },
    });

    res.json(updated);
  })
);

// ── Renter: list own payments ──────────────────────────────────────────────
router.get(
  "/mine",
  authenticate,
  requirePermission("payment.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, req.user!.userId))
      .orderBy(desc(payments.createdAt));
    res.json(rows);
  })
);

// ── Admin: release owner payout for a rental ───────────────────────────────
router.post(
  "/payout/:rentalId",
  authenticate,
  requirePermission("payout.release"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rentalId = Number(req.params.rentalId);
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (!["closed", "closed_with_penalty"].includes(rental.status)) {
      throw new LegalStateError("Rental must be closed before payout");
    }

    const payoutCalc = computeOwnerPayout({
      rentalSubtotalHalalas: rental.rentalSubtotalHalalas,
      commissionPct: 20,
    });

    const [payout] = await db
      .insert(payouts)
      .values({
        ownerId: rental.ownerId,
        rentalId: rental.id,
        grossHalalas: payoutCalc.grossHalalas,
        commissionHalalas: payoutCalc.commissionHalalas,
        netHalalas: payoutCalc.netHalalas,
        status: "processing",
      })
      .returning();

    await recordAudit({
      req,
      action: "payout.release",
      entityType: "payout",
      entityId: payout.id,
      after: payout,
    });

    const [owner] = await db.select().from(users).where(eq(users.id, rental.ownerId)).limit(1);
    if (owner) {
      notifyOwnerPayout({
        ownerEmail: owner.email,
        ownerName: owner.fullName,
        rentalReference: rental.reference,
        netSar: formatHalalas(payout.netHalalas),
      }).catch((err) => console.error("[notification] payout.release failed:", err));
    }

    res.json(payout);
  })
);

// ── Owner: list own payouts ────────────────────────────────────────────────
router.get(
  "/payouts/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(payouts)
      .where(eq(payouts.ownerId, req.user!.userId))
      .orderBy(desc(payouts.createdAt));
    res.json(rows);
  })
);

export default router;
