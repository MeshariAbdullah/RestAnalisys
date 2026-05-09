import { Router } from "express";
import { sql, eq, desc, and, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  assets,
  rentals,
  payments,
  users,
  disputes,
  inspections,
  auditLogs,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/platform",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const [userStats] = await db
      .select({
        total: sql<number>`count(*)`,
        renters: sql<number>`count(*) filter (where role = 'renter')`,
        owners: sql<number>`count(*) filter (where role = 'owner')`,
        blocked: sql<number>`count(*) filter (where is_blocked = true)`,
        nafathVerified: sql<number>`count(*) filter (where nafath_verified = true)`,
      })
      .from(users);

    const [assetStats] = await db
      .select({
        total: sql<number>`count(*)`,
        listed: sql<number>`count(*) filter (where status = 'listed')`,
        rented: sql<number>`count(*) filter (where status = 'rented_out')`,
        pending: sql<number>`count(*) filter (where status = 'pending_approval')`,
        avgValueHalalas: sql<number>`coalesce(avg(evaluated_value_halalas) filter (where evaluated_value_halalas > 0), 0)`,
        totalValueHalalas: sql<number>`coalesce(sum(evaluated_value_halalas) filter (where status not in ('rejected','withdrawn','lost_or_destroyed')), 0)`,
      })
      .from(assets);

    const [rentalStats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
        inDispute: sql<number>`count(*) filter (where status = 'in_dispute')`,
        enforcement: sql<number>`count(*) filter (where status = 'enforcement')`,
        totalRevenueHalalas: sql<number>`coalesce(sum(total_payable_halalas) filter (where status in ('closed','closed_with_penalty','active')), 0)`,
        platformFeesHalalas: sql<number>`coalesce(sum(platform_fee_halalas) filter (where status in ('closed','closed_with_penalty','active')), 0)`,
        vatCollectedHalalas: sql<number>`coalesce(sum(vat_halalas) filter (where status in ('closed','closed_with_penalty','active')), 0)`,
        avgDurationDays: sql<number>`coalesce(avg(duration_days), 0)`,
      })
      .from(rentals);

    const [disputeStats] = await db
      .select({
        total: sql<number>`count(*)`,
        open: sql<number>`count(*) filter (where status = 'open')`,
        investigating: sql<number>`count(*) filter (where status = 'investigating')`,
        resolved: sql<number>`count(*) filter (where status in ('resolved_for_renter','resolved_for_platform','resolved_for_owner','closed'))`,
        escalated: sql<number>`count(*) filter (where status = 'escalated_to_legal')`,
      })
      .from(disputes);

    res.json({
      users: userStats,
      assets: assetStats,
      rentals: rentalStats,
      disputes: disputeStats,
    });
  })
);

router.get(
  "/revenue/monthly",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        rentalCount: sql<number>`count(*)`,
        revenueHalalas: sql<number>`coalesce(sum(total_payable_halalas), 0)`,
        platformFeesHalalas: sql<number>`coalesce(sum(platform_fee_halalas), 0)`,
        vatHalalas: sql<number>`coalesce(sum(vat_halalas), 0)`,
      })
      .from(rentals)
      .where(
        sql`status in ('closed','closed_with_penalty','active','confirmed')`
      )
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM') desc`)
      .limit(12);

    res.json(rows);
  })
);

router.get(
  "/categories",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        category: assets.category,
        count: sql<number>`count(*)`,
        listedCount: sql<number>`count(*) filter (where status = 'listed')`,
        avgDailyPriceHalalas: sql<number>`coalesce(avg(daily_rental_price_halalas) filter (where daily_rental_price_halalas > 0), 0)`,
        totalValueHalalas: sql<number>`coalesce(sum(evaluated_value_halalas), 0)`,
      })
      .from(assets)
      .where(sql`status not in ('rejected','withdrawn')`)
      .groupBy(assets.category)
      .orderBy(sql`count(*) desc`);

    res.json(rows);
  })
);

router.get(
  "/top-brands",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        brand: assets.brand,
        assetCount: sql<number>`count(*)`,
        rentalCount: sql<number>`(
          select count(*) from rentals r
          where r.asset_id = any(array_agg(assets.id))
          and r.status in ('closed','closed_with_penalty','active')
        )`,
        avgValueHalalas: sql<number>`coalesce(avg(evaluated_value_halalas), 0)`,
      })
      .from(assets)
      .where(sql`status not in ('rejected','withdrawn')`)
      .groupBy(assets.brand)
      .orderBy(sql`count(*) desc`)
      .limit(20);

    res.json(rows);
  })
);

router.get(
  "/risk-overview",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const [riskDistribution] = await db
      .select({
        lowRisk: sql<number>`count(*) filter (where risk_category = 'low')`,
        mediumRisk: sql<number>`count(*) filter (where risk_category = 'medium')`,
        highRisk: sql<number>`count(*) filter (where risk_category = 'high')`,
        ultraHighRisk: sql<number>`count(*) filter (where risk_category = 'ultra_high')`,
        avgTrustScore: sql<number>`coalesce(avg(trust_score), 0)`,
      })
      .from(users)
      .where(sql`role in ('renter','owner')`);

    const recentRejections = await db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        total: sql<number>`count(*)`,
        rejected: sql<number>`count(*) filter (where approved = false)`,
        approved: sql<number>`count(*) filter (where approved = true)`,
      })
      .from(sql`risk_scores`)
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM') desc`)
      .limit(6);

    res.json({
      distribution: riskDistribution,
      monthlyDecisions: recentRejections,
    });
  })
);

router.get(
  "/activity",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorRole: auditLogs.actorRole,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    res.json(rows);
  })
);

export default router;
