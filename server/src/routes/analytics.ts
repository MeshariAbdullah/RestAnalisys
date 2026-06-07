import { Router } from "express";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  users,
  assets,
  rentals,
  payments,
  disputes,
  sanadRecords,
  inspections,
  payouts,
} from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// ── Asset category breakdown ──────────────────────────────────────────────
router.get(
  "/assets/by-category",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select category,
             count(*) as total,
             count(*) filter (where status = 'listed') as listed,
             count(*) filter (where status = 'rented_out') as rented,
             coalesce(avg(evaluated_value_halalas), 0)::bigint as avg_value_halalas
      from assets
      group by category
      order by total desc
    `);
    res.json(rows.rows);
  })
);

// ── Revenue by month (last 12 months) ─────────────────────────────────────
router.get(
  "/revenue/monthly",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
             sum(total_payable_halalas) as total_revenue_halalas,
             sum(platform_fee_halalas) as platform_fee_halalas,
             sum(vat_halalas) as vat_halalas,
             count(*) as rental_count
      from rentals
      where created_at >= now() - interval '12 months'
        and status not in ('cancelled')
      group by 1
      order by 1 asc
    `);
    res.json(rows.rows);
  })
);

// ── Top assets by rental count ────────────────────────────────────────────
router.get(
  "/assets/top-rented",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select a.id, a.title, a.brand, a.category,
             a.daily_rental_price_halalas,
             count(r.id) as rental_count,
             coalesce(sum(r.total_payable_halalas), 0) as total_revenue_halalas
      from assets a
      left join rentals r on r.asset_id = a.id and r.status not in ('cancelled')
      group by a.id, a.title, a.brand, a.category, a.daily_rental_price_halalas
      having count(r.id) > 0
      order by rental_count desc
      limit 20
    `);
    res.json(rows.rows);
  })
);

// ── User acquisition over time ────────────────────────────────────────────
router.get(
  "/users/growth",
  authenticate,
  requirePermission("user.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
             role,
             count(*) as signups
      from users
      where created_at >= now() - interval '6 months'
      group by 1, 2
      order by 1 asc
    `);
    res.json(rows.rows);
  })
);

// ── Rental lifecycle funnel ───────────────────────────────────────────────
router.get(
  "/rentals/funnel",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select status, count(*) as count
      from rentals
      group by status
      order by count desc
    `);
    res.json(rows.rows);
  })
);

// ── Average rental duration and value ─────────────────────────────────────
router.get(
  "/rentals/averages",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const result = await db.execute(sql`
      select
        round(avg(duration_days), 1) as avg_duration_days,
        round(avg(total_payable_halalas))::bigint as avg_total_halalas,
        round(avg(daily_price_halalas))::bigint as avg_daily_price_halalas,
        round(avg(trust_score_at_booking), 1) as avg_trust_score,
        count(*) as total_rentals
      from rentals
      where status not in ('cancelled')
    `);
    res.json(result.rows[0]);
  })
);

// ── Dispute resolution stats ──────────────────────────────────────────────
router.get(
  "/disputes/stats",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select status, count(*) as count,
             coalesce(sum(resolution_amount_halalas), 0) as total_resolution_halalas
      from disputes
      group by status
      order by count desc
    `);

    const timingResult = await db.execute(sql`
      select
        round(avg(extract(epoch from (resolved_at - opened_at)) / 3600), 1) as avg_resolution_hours
      from disputes
      where resolved_at is not null
    `);

    res.json({
      byStatus: rows.rows,
      avgResolutionHours: (timingResult.rows[0] as any)?.avg_resolution_hours ?? null,
    });
  })
);

// ── Payout summary ────────────────────────────────────────────────────────
router.get(
  "/payouts/summary",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const payoutResult = await db.execute(sql`
      select
        count(*) as total_payouts,
        count(*) filter (where status = 'paid') as paid_count,
        count(*) filter (where status = 'pending') as pending_count,
        coalesce(sum(net_halalas) filter (where status = 'paid'), 0) as total_paid_halalas,
        coalesce(sum(net_halalas) filter (where status = 'pending'), 0) as total_pending_halalas,
        coalesce(sum(commission_halalas), 0) as total_commission_halalas
      from payouts
    `);
    res.json(payoutResult.rows[0]);
  })
);

// ── Platform health overview ──────────────────────────────────────────────
router.get(
  "/platform/health",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const [activeRentals] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentals)
      .where(inArray(rentals.status, ["active", "out_for_delivery", "confirmed"]));

    const overdueResult = await db.execute(sql`
      select count(*) as count
      from rentals
      where status in ('active', 'return_in_transit')
        and end_date < current_date
    `);

    const avgRiskResult = await db.execute(sql`
      select round(avg(trust_score_at_booking), 1) as avg_score
      from rentals
      where created_at >= now() - interval '30 days'
        and status not in ('cancelled')
    `);

    const utilizationResult = await db.execute(sql`
      select
        count(*) filter (where status = 'rented_out') as rented,
        count(*) filter (where status = 'listed') as available,
        case when count(*) filter (where status in ('listed', 'rented_out')) > 0
          then round(
            count(*) filter (where status = 'rented_out')::numeric /
            count(*) filter (where status in ('listed', 'rented_out'))::numeric * 100, 1
          )
          else 0
        end as utilization_pct
      from assets
    `);

    res.json({
      activeRentals: Number((activeRentals as any)?.count ?? 0),
      overdueRentals: Number((overdueResult.rows[0] as any)?.count ?? 0),
      avgTrustScore30d: (avgRiskResult.rows[0] as any)?.avg_score ?? null,
      assetUtilization: utilizationResult.rows[0],
    });
  })
);

export default router;
