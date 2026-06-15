import { Router } from "express";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, payments, payouts, assets, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown) => {
    const str = String(val ?? "");
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

router.get(
  "/rentals",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions: any[] = [];
    if (from) conditions.push(gte(rentals.createdAt, new Date(from)));
    if (to) conditions.push(lte(rentals.createdAt, new Date(to)));

    const rows = await db
      .select({
        id: rentals.id,
        reference: rentals.reference,
        status: rentals.status,
        startDate: rentals.startDate,
        endDate: rentals.endDate,
        durationDays: rentals.durationDays,
        dailyPriceHalalas: rentals.dailyPriceHalalas,
        rentalSubtotalHalalas: rentals.rentalSubtotalHalalas,
        platformFeeHalalas: rentals.platformFeeHalalas,
        vatHalalas: rentals.vatHalalas,
        totalPayableHalalas: rentals.totalPayableHalalas,
        createdAt: rentals.createdAt,
      })
      .from(rentals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(rentals.createdAt))
      .limit(10000);

    const format = req.query.format ?? "json";
    if (format === "csv") {
      const headers = [
        "id", "reference", "status", "startDate", "endDate", "durationDays",
        "dailyPriceHalalas", "rentalSubtotalHalalas", "platformFeeHalalas",
        "vatHalalas", "totalPayableHalalas", "createdAt",
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=rentals-export.csv");
      res.send(toCsv(headers, rows as any));
    } else {
      res.json({ count: rows.length, rows });
    }
  })
);

router.get(
  "/payments",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions: any[] = [];
    if (from) conditions.push(gte(payments.createdAt, new Date(from)));
    if (to) conditions.push(lte(payments.createdAt, new Date(to)));

    const rows = await db
      .select({
        id: payments.id,
        rentalId: payments.rentalId,
        type: payments.type,
        status: payments.status,
        amountHalalas: payments.amountHalalas,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        invoiceNumber: payments.invoiceNumber,
        capturedAt: payments.capturedAt,
        refundedAt: payments.refundedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(10000);

    const format = req.query.format ?? "json";
    if (format === "csv") {
      const headers = [
        "id", "rentalId", "type", "status", "amountHalalas", "gateway",
        "gatewayTransactionId", "invoiceNumber", "capturedAt", "refundedAt", "createdAt",
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=payments-export.csv");
      res.send(toCsv(headers, rows as any));
    } else {
      res.json({ count: rows.length, rows });
    }
  })
);

router.get(
  "/payouts",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(payouts)
      .orderBy(desc(payouts.createdAt))
      .limit(10000);

    const format = req.query.format ?? "json";
    if (format === "csv") {
      const headers = [
        "id", "ownerId", "rentalId", "grossHalalas", "commissionHalalas",
        "netHalalas", "status", "paidAt", "createdAt",
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=payouts-export.csv");
      res.send(toCsv(headers, rows as any));
    } else {
      res.json({ count: rows.length, rows });
    }
  })
);

router.get(
  "/financial-summary",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = (req.query.from as string) ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);

    const revenue = await db.execute(sql`
      select
        count(*) as total_rentals,
        coalesce(sum(rental_subtotal_halalas), 0) as total_rental_revenue,
        coalesce(sum(platform_fee_halalas), 0) as total_platform_fees,
        coalesce(sum(vat_halalas), 0) as total_vat,
        coalesce(sum(total_payable_halalas), 0) as total_collected,
        count(*) filter (where status = 'closed') as closed_clean,
        count(*) filter (where status = 'closed_with_penalty') as closed_penalty,
        count(*) filter (where status = 'cancelled') as cancelled,
        count(*) filter (where status = 'enforcement') as enforced
      from rentals
      where created_at >= ${from}::date and created_at <= ${to}::date + interval '1 day'
    `);

    const payoutSummary = await db.execute(sql`
      select
        count(*) as total_payouts,
        coalesce(sum(gross_halalas), 0) as total_gross,
        coalesce(sum(commission_halalas), 0) as total_commission,
        coalesce(sum(net_halalas), 0) as total_net_paid
      from payouts
      where created_at >= ${from}::date and created_at <= ${to}::date + interval '1 day'
    `);

    res.json({
      period: { from, to },
      revenue: revenue.rows[0],
      payouts: payoutSummary.rows[0],
    });
  })
);

export default router;
