import { Router } from "express";
import { db } from "../db/index.js";
import { rentals, payments, assets, users, disputes, payouts } from "../db/schema.js";
import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Financial summary report ────────────────────────────────────────────────
router.get(
  "/financial",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = (req.query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);

    const [rentalRevenue] = await db
      .select({
        totalRentals: count(),
        totalSubtotal: sum(rentals.rentalSubtotalHalalas),
        totalFees: sum(rentals.platformFeeHalalas),
        totalVat: sum(rentals.vatHalalas),
        totalCollected: sum(rentals.totalPayableHalalas),
      })
      .from(rentals)
      .where(
        and(
          gte(rentals.createdAt, new Date(from + "T00:00:00Z")),
          lte(rentals.createdAt, new Date(to + "T23:59:59Z"))
        )
      );

    const [paymentStats] = await db
      .select({
        captured: sql<number>`count(*) filter (where status = 'captured')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
        refunded: sql<number>`count(*) filter (where status = 'refunded')`,
        totalCaptured: sql<number>`coalesce(sum(amount_halalas) filter (where status = 'captured'), 0)`,
        totalRefunded: sql<number>`coalesce(sum(amount_halalas) filter (where status = 'refunded'), 0)`,
      })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, new Date(from + "T00:00:00Z")),
          lte(payments.createdAt, new Date(to + "T23:59:59Z"))
        )
      );

    const [payoutStats] = await db
      .select({
        totalPayouts: count(),
        totalPaid: sql<number>`coalesce(sum(net_halalas) filter (where status = 'paid'), 0)`,
        totalPending: sql<number>`coalesce(sum(net_halalas) filter (where status = 'pending'), 0)`,
        totalCommission: sql<number>`coalesce(sum(commission_halalas), 0)`,
      })
      .from(payouts)
      .where(
        and(
          gte(payouts.createdAt, new Date(from + "T00:00:00Z")),
          lte(payouts.createdAt, new Date(to + "T23:59:59Z"))
        )
      );

    const statusBreakdown = await db
      .select({
        status: rentals.status,
        count: count(),
      })
      .from(rentals)
      .where(
        and(
          gte(rentals.createdAt, new Date(from + "T00:00:00Z")),
          lte(rentals.createdAt, new Date(to + "T23:59:59Z"))
        )
      )
      .groupBy(rentals.status);

    await recordAudit({
      req,
      action: "report.financial",
      entityType: "report",
      after: { from, to },
    });

    res.json({
      period: { from, to },
      rental: {
        totalRentals: Number(rentalRevenue.totalRentals ?? 0),
        subtotalHalalas: Number(rentalRevenue.totalSubtotal ?? 0),
        platformFeesHalalas: Number(rentalRevenue.totalFees ?? 0),
        vatHalalas: Number(rentalRevenue.totalVat ?? 0),
        totalCollectedHalalas: Number(rentalRevenue.totalCollected ?? 0),
      },
      payments: {
        captured: Number(paymentStats.captured ?? 0),
        failed: Number(paymentStats.failed ?? 0),
        refunded: Number(paymentStats.refunded ?? 0),
        totalCapturedHalalas: Number(paymentStats.totalCaptured ?? 0),
        totalRefundedHalalas: Number(paymentStats.totalRefunded ?? 0),
      },
      payouts: {
        total: Number(payoutStats.totalPayouts ?? 0),
        paidHalalas: Number(payoutStats.totalPaid ?? 0),
        pendingHalalas: Number(payoutStats.totalPending ?? 0),
        commissionHalalas: Number(payoutStats.totalCommission ?? 0),
      },
      statusBreakdown: statusBreakdown.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    });
  })
);

// ── Asset utilization report ────────────────────────────────────────────────
router.get(
  "/assets",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const categoryBreakdown = await db
      .select({
        category: assets.category,
        total: count(),
        totalValue: sql<number>`coalesce(sum(evaluated_value_halalas), 0)`,
      })
      .from(assets)
      .groupBy(assets.category);

    const statusBreakdown = await db
      .select({
        status: assets.status,
        count: count(),
      })
      .from(assets)
      .groupBy(assets.status);

    const topAssets = await db
      .select({
        assetId: rentals.assetId,
        rentalCount: count(),
        totalRevenue: sum(rentals.totalPayableHalalas),
      })
      .from(rentals)
      .groupBy(rentals.assetId)
      .orderBy(desc(count()))
      .limit(10);

    res.json({
      byCategory: categoryBreakdown.map((r) => ({
        category: r.category,
        total: Number(r.total),
        totalValueHalalas: Number(r.totalValue),
      })),
      byStatus: statusBreakdown.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      topAssets: topAssets.map((r) => ({
        assetId: r.assetId,
        rentalCount: Number(r.rentalCount),
        totalRevenueHalalas: Number(r.totalRevenue ?? 0),
      })),
    });
  })
);

// ── User activity report ────────────────────────────────────────────────────
router.get(
  "/users",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const roleBreakdown = await db
      .select({
        role: users.role,
        total: count(),
        blocked: sql<number>`count(*) filter (where is_blocked = true)`,
        nafathVerified: sql<number>`count(*) filter (where nafath_verified = true)`,
      })
      .from(users)
      .groupBy(users.role);

    const riskBreakdown = await db
      .select({
        riskCategory: users.riskCategory,
        count: count(),
        avgTrustScore: sql<number>`round(avg(trust_score))`,
      })
      .from(users)
      .where(eq(users.role, "renter"))
      .groupBy(users.riskCategory);

    const topRenters = await db
      .select({
        renterId: rentals.renterId,
        rentalCount: count(),
        totalSpent: sum(rentals.totalPayableHalalas),
      })
      .from(rentals)
      .groupBy(rentals.renterId)
      .orderBy(desc(count()))
      .limit(10);

    res.json({
      byRole: roleBreakdown.map((r) => ({
        role: r.role,
        total: Number(r.total),
        blocked: Number(r.blocked),
        nafathVerified: Number(r.nafathVerified),
      })),
      renterRisk: riskBreakdown.map((r) => ({
        riskCategory: r.riskCategory,
        count: Number(r.count),
        avgTrustScore: Number(r.avgTrustScore),
      })),
      topRenters: topRenters.map((r) => ({
        renterId: r.renterId,
        rentalCount: Number(r.rentalCount),
        totalSpentHalalas: Number(r.totalSpent ?? 0),
      })),
    });
  })
);

// ── Dispute report ──────────────────────────────────────────────────────────
router.get(
  "/disputes",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const categoryBreakdown = await db
      .select({
        category: disputes.category,
        total: count(),
        resolved: sql<number>`count(*) filter (where status like 'resolved%' or status = 'closed')`,
        open: sql<number>`count(*) filter (where status in ('open','investigating','awaiting_evidence'))`,
        totalResolutionAmount: sql<number>`coalesce(sum(resolution_amount_halalas), 0)`,
      })
      .from(disputes)
      .groupBy(disputes.category);

    const avgResolutionTime = await db
      .select({
        avgDays: sql<number>`round(avg(extract(epoch from (resolved_at - opened_at)) / 86400), 1)`,
      })
      .from(disputes)
      .where(sql`resolved_at is not null`);

    res.json({
      byCategory: categoryBreakdown.map((r) => ({
        category: r.category,
        total: Number(r.total),
        resolved: Number(r.resolved),
        open: Number(r.open),
        totalResolutionAmountHalalas: Number(r.totalResolutionAmount),
      })),
      avgResolutionDays: Number(avgResolutionTime[0]?.avgDays ?? 0),
    });
  })
);

// ── CSV export ──────────────────────────────────────────────────────────────
router.get(
  "/export/rentals",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = (req.query.from as string) || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);

    const rows = await db
      .select({
        id: rentals.id,
        reference: rentals.reference,
        status: rentals.status,
        startDate: rentals.startDate,
        endDate: rentals.endDate,
        durationDays: rentals.durationDays,
        dailyPriceHalalas: rentals.dailyPriceHalalas,
        subtotalHalalas: rentals.rentalSubtotalHalalas,
        platformFeeHalalas: rentals.platformFeeHalalas,
        vatHalalas: rentals.vatHalalas,
        totalHalalas: rentals.totalPayableHalalas,
        createdAt: rentals.createdAt,
      })
      .from(rentals)
      .where(
        and(
          gte(rentals.createdAt, new Date(from + "T00:00:00Z")),
          lte(rentals.createdAt, new Date(to + "T23:59:59Z"))
        )
      )
      .orderBy(desc(rentals.createdAt));

    const headers = [
      "id", "reference", "status", "start_date", "end_date", "duration_days",
      "daily_price_halalas", "subtotal_halalas", "platform_fee_halalas",
      "vat_halalas", "total_halalas", "created_at",
    ];
    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id, r.reference, r.status, r.startDate, r.endDate, r.durationDays,
          r.dailyPriceHalalas, r.subtotalHalalas, r.platformFeeHalalas,
          r.vatHalalas, r.totalHalalas, r.createdAt.toISOString(),
        ].join(",")
      ),
    ];

    await recordAudit({
      req,
      action: "report.export_rentals",
      entityType: "report",
      after: { from, to, rowCount: rows.length },
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="rentals_${from}_${to}.csv"`);
    res.send(csvLines.join("\n"));
  })
);

router.get(
  "/export/payments",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = (req.query.from as string) || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);

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
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, new Date(from + "T00:00:00Z")),
          lte(payments.createdAt, new Date(to + "T23:59:59Z"))
        )
      )
      .orderBy(desc(payments.createdAt));

    const headers = [
      "id", "rental_id", "type", "status", "amount_halalas",
      "gateway", "gateway_transaction_id", "invoice_number", "created_at",
    ];
    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id, r.rentalId ?? "", r.type, r.status, r.amountHalalas,
          r.gateway, r.gatewayTransactionId ?? "", r.invoiceNumber ?? "",
          r.createdAt.toISOString(),
        ].join(",")
      ),
    ];

    await recordAudit({
      req,
      action: "report.export_payments",
      entityType: "report",
      after: { from, to, rowCount: rows.length },
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payments_${from}_${to}.csv"`);
    res.send(csvLines.join("\n"));
  })
);

export default router;
