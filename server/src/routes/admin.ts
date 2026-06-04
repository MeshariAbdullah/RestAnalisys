/**
 * Admin dashboard routes — financial overview, risk monitoring, user management.
 */

import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  users,
  assets,
  rentals,
  payments,
  disputes,
  sanadRecords,
  riskScores,
  auditLogs,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Top-level KPIs for the admin dashboard ─────────────────────────────────
router.get(
  "/kpis",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [listedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(eq(assets.status, "listed"));
    const [rentedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(eq(assets.status, "rented_out"));
    const [rentalsMtd] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentals)
      .where(sql`created_at >= date_trunc('month', now())`);

    const revenue = await db
      .select({
        rentalSubtotal: sql<string>`coalesce(sum(rental_subtotal_halalas),0)`,
        platformFee: sql<string>`coalesce(sum(platform_fee_halalas),0)`,
        vat: sql<string>`coalesce(sum(vat_halalas),0)`,
      })
      .from(rentals)
      .where(inArray(rentals.status, ["closed", "closed_with_penalty", "active"]));

    const [openDisputes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disputes)
      .where(inArray(disputes.status, ["open", "investigating", "awaiting_evidence"]));

    const [activeSanads] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sanadRecords)
      .where(eq(sanadRecords.status, "active"));

    const [underExecution] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sanadRecords)
      .where(eq(sanadRecords.status, "under_execution"));

    res.json({
      users: Number(usersCount?.count ?? 0),
      listedAssets: Number(listedCount?.count ?? 0),
      rentedAssets: Number(rentedCount?.count ?? 0),
      rentalsThisMonth: Number(rentalsMtd?.count ?? 0),
      revenue: {
        rentalSubtotalHalalas: Number(revenue[0]?.rentalSubtotal ?? 0),
        platformFeeHalalas: Number(revenue[0]?.platformFee ?? 0),
        vatHalalas: Number(revenue[0]?.vat ?? 0),
      },
      openDisputes: Number(openDisputes?.count ?? 0),
      activeSanads: Number(activeSanads?.count ?? 0),
      sanadsUnderExecution: Number(underExecution?.count ?? 0),
    });
  })
);

// ── Revenue trend chart ────────────────────────────────────────────────────
router.get(
  "/revenue-trend",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
             sum(total_payable_halalas) as total_halalas,
             sum(platform_fee_halalas) as fee_halalas,
             count(*) as rentals
      from rentals
      where created_at >= now() - interval '30 days'
      group by 1
      order by 1 asc
    `);
    res.json(rows.rows);
  })
);

// ── Risk monitoring: users with low trust scores ───────────────────────────
router.get(
  "/risk/low-trust",
  authenticate,
  requirePermission("user.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        trustScore: users.trustScore,
        riskCategory: users.riskCategory,
        isBlocked: users.isBlocked,
      })
      .from(users)
      .where(sql`trust_score < 60`)
      .orderBy(users.trustScore)
      .limit(50);
    res.json(rows);
  })
);

// ── User list ──────────────────────────────────────────────────────────────
router.get(
  "/users",
  authenticate,
  requirePermission("user.read"),
  asyncHandler(async (req, res) => {
    const role = (req.query.role as string | undefined) ?? undefined;
    const query = db.select().from(users);
    const rows = role
      ? await query.where(eq(users.role, role as any)).limit(200)
      : await query.limit(200);
    res.json(rows);
  })
);

// ── Block / unblock a user ─────────────────────────────────────────────────
router.post(
  "/users/:id/block",
  authenticate,
  requirePermission("user.block"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { reason, block } = req.body as { reason?: string; block: boolean };
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundError("User");
    const [updated] = await db
      .update(users)
      .set({
        isBlocked: block,
        blockedReason: block ? reason ?? "blocked by admin" : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    await recordAudit({
      req,
      action: block ? "user.block" : "user.unblock",
      entityType: "user",
      entityId: id,
      before: user,
      after: updated,
    });
    res.json(updated);
  })
);

// ── Create a staff user (admin/inspector/operations) ───────────────────────
router.post(
  "/users",
  authenticate,
  requirePermission("user.create_staff"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { email, fullName, role, passwordHash } = req.body as {
      email: string;
      fullName: string;
      role: "admin" | "operations" | "inspector";
      passwordHash: string;
    };
    const [user] = await db
      .insert(users)
      .values({
        email,
        fullName,
        role,
        passwordHash,
        nafathVerified: true,
        kycStatus: "verified",
      })
      .returning();
    await recordAudit({
      req,
      action: "user.create_staff",
      entityType: "user",
      entityId: user.id,
      after: { email, role },
    });
    res.status(201).json(user);
  })
);

// ── Recent risk decisions (for audit) ──────────────────────────────────────
router.get(
  "/risk/recent",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(riskScores)
      .orderBy(desc(riskScores.createdAt))
      .limit(100);
    res.json(rows);
  })
);

// ── Analytics: user growth over time ──────────────────────────────────────
router.get(
  "/analytics/user-growth",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
             count(*) as new_users,
             sum(count(*)) over (order by date_trunc('day', created_at)) as cumulative
      from users
      where created_at >= now() - interval '90 days'
      group by 1
      order by 1 asc
    `);
    res.json(rows.rows);
  })
);

// ── Analytics: asset breakdown by category ────────────────────────────────
router.get(
  "/analytics/category-breakdown",
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

// ── Analytics: rental conversion funnel ──────────────────────────────────
router.get(
  "/analytics/rental-funnel",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select status, count(*) as count
      from rentals
      where created_at >= now() - interval '30 days'
      group by status
      order by count desc
    `);
    res.json(rows.rows);
  })
);

// ── Analytics: top performing assets ─────────────────────────────────────
router.get(
  "/analytics/top-assets",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select a.id, a.title, a.brand, a.category,
             count(r.id) as rental_count,
             coalesce(sum(r.total_payable_halalas), 0)::bigint as total_revenue_halalas
      from assets a
      left join rentals r on r.asset_id = a.id
        and r.status in ('closed', 'closed_with_penalty', 'active')
      group by a.id, a.title, a.brand, a.category
      having count(r.id) > 0
      order by total_revenue_halalas desc
      limit 20
    `);
    res.json(rows.rows);
  })
);

// ── Analytics: monthly summary ───────────────────────────────────────────
router.get(
  "/analytics/monthly-summary",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
             count(*) as rentals,
             coalesce(sum(total_payable_halalas), 0)::bigint as revenue_halalas,
             coalesce(sum(platform_fee_halalas), 0)::bigint as platform_fee_halalas,
             coalesce(sum(vat_halalas), 0)::bigint as vat_halalas
      from rentals
      where created_at >= now() - interval '12 months'
      group by 1
      order by 1 asc
    `);
    res.json(rows.rows);
  })
);

// ── Audit log viewer ─────────────────────────────────────────────────────
router.get(
  "/audit-logs",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const entityType = req.query.entityType as string | undefined;
    const action = req.query.action as string | undefined;

    let query = db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    if (entityType) {
      query = query.where(eq(auditLogs.entityType, entityType)) as typeof query;
    }
    if (action) {
      query = query.where(sql`action like ${`%${action}%`}`) as typeof query;
    }

    const rows = await query;
    res.json(rows);
  })
);

// ── Audit log summary (action counts) ────────────────────────────────────
router.get(
  "/audit-logs/summary",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select action, entity_type, count(*) as count,
             max(created_at) as last_occurrence
      from audit_logs
      where created_at >= now() - interval '30 days'
      group by action, entity_type
      order by count desc
    `);
    res.json(rows.rows);
  })
);

// ── Financial export (CSV) ────────────────────────────────────────────────
router.get(
  "/export/rentals",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req, res) => {
    const from = (req.query.from as string) || "";
    const to = (req.query.to as string) || "";

    let whereClause = sql`1=1`;
    if (from) whereClause = sql`${whereClause} AND created_at >= ${from}::date`;
    if (to) whereClause = sql`${whereClause} AND created_at <= ${to}::date + interval '1 day'`;

    const rows = await db.execute(sql`
      select r.reference, r.status, r.start_date, r.end_date, r.duration_days,
             r.daily_price_halalas, r.rental_subtotal_halalas,
             r.platform_fee_halalas, r.vat_halalas, r.total_payable_halalas,
             r.trust_score_at_booking, r.legal_commitment_pct,
             r.legal_commitment_halalas,
             u_renter.full_name as renter_name, u_renter.email as renter_email,
             u_owner.full_name as owner_name,
             a.title as asset_title, a.brand as asset_brand, a.category as asset_category,
             r.created_at
      from rentals r
      join users u_renter on u_renter.id = r.renter_id
      join users u_owner on u_owner.id = r.owner_id
      join assets a on a.id = r.asset_id
      where ${whereClause}
      order by r.created_at desc
    `);

    const header = [
      "reference", "status", "start_date", "end_date", "duration_days",
      "daily_price_sar", "subtotal_sar", "platform_fee_sar", "vat_sar", "total_sar",
      "trust_score", "commitment_pct", "commitment_sar",
      "renter_name", "renter_email", "owner_name",
      "asset_title", "asset_brand", "asset_category", "created_at",
    ].join(",");

    const csvRows = (rows.rows as any[]).map((r) =>
      [
        r.reference, r.status, r.start_date, r.end_date, r.duration_days,
        (Number(r.daily_price_halalas) / 100).toFixed(2),
        (Number(r.rental_subtotal_halalas) / 100).toFixed(2),
        (Number(r.platform_fee_halalas) / 100).toFixed(2),
        (Number(r.vat_halalas) / 100).toFixed(2),
        (Number(r.total_payable_halalas) / 100).toFixed(2),
        r.trust_score_at_booking, r.legal_commitment_pct,
        (Number(r.legal_commitment_halalas) / 100).toFixed(2),
        `"${r.renter_name}"`, r.renter_email, `"${r.owner_name}"`,
        `"${r.asset_title}"`, r.asset_brand, r.asset_category,
        new Date(r.created_at).toISOString(),
      ].join(",")
    );

    const csv = [header, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="mlr-rentals-export.csv"`);
    res.send(csv);
  })
);

// ── Platform health report ───────────────────────────────────────────────
router.get(
  "/health-report",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [assetsCount] = await db.select({ count: sql<number>`count(*)` }).from(assets);
    const [rentalsCount] = await db.select({ count: sql<number>`count(*)` }).from(rentals);

    const statusBreakdown = await db.execute(sql`
      select 'assets' as entity,
             json_object_agg(status, cnt) as breakdown
      from (select status, count(*) as cnt from assets group by status) sub
      union all
      select 'rentals',
             json_object_agg(status, cnt)
      from (select status, count(*) as cnt from rentals group by status) sub
    `);

    const recentActivity = await db.execute(sql`
      select action, count(*) as count
      from audit_logs
      where created_at >= now() - interval '24 hours'
      group by action
      order by count desc
      limit 10
    `);

    res.json({
      overview: {
        totalUsers: Number(usersCount?.count ?? 0),
        totalAssets: Number(assetsCount?.count ?? 0),
        totalRentals: Number(rentalsCount?.count ?? 0),
      },
      statusBreakdown: statusBreakdown.rows,
      recentActivity24h: recentActivity.rows,
      generatedAt: new Date().toISOString(),
    });
  })
);

export default router;
