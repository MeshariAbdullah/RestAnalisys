/**
 * Admin dashboard routes — financial overview, risk monitoring, user management,
 * platform analytics, and overdue management.
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
  operationalAlerts,
  auditLogs,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { detectOverdueRentals } from "../services/overdueDetector.js";

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

// ── Platform analytics — category breakdown ───────────────────────────────
router.get(
  "/analytics/categories",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select category,
             count(*) as total,
             count(*) filter (where status = 'listed') as listed,
             count(*) filter (where status = 'rented_out') as rented,
             coalesce(avg(evaluated_value_halalas), 0)::bigint as avg_value_halalas,
             coalesce(sum(daily_rental_price_halalas), 0)::bigint as total_daily_revenue_halalas
      from assets
      group by category
      order by total desc
    `);
    res.json(rows.rows);
  })
);

// ── Platform analytics — rental status distribution ───────────────────────
router.get(
  "/analytics/rental-status",
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

// ── Platform analytics — top renters ──────────────────────────────────────
router.get(
  "/analytics/top-renters",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select r.renter_id,
             u.full_name,
             u.email,
             u.trust_score,
             count(*) as total_rentals,
             count(*) filter (where r.status in ('closed','closed_with_penalty')) as completed,
             coalesce(sum(r.total_payable_halalas), 0)::bigint as total_spent_halalas
      from rentals r
      join users u on u.id = r.renter_id
      group by r.renter_id, u.full_name, u.email, u.trust_score
      order by total_rentals desc
      limit 20
    `);
    res.json(rows.rows);
  })
);

// ── Platform analytics — top owners by revenue ────────────────────────────
router.get(
  "/analytics/top-owners",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select a.owner_id,
             u.full_name,
             u.email,
             count(distinct a.id) as total_assets,
             count(distinct r.id) as total_rentals,
             coalesce(sum(r.rental_subtotal_halalas), 0)::bigint as total_revenue_halalas
      from assets a
      join users u on u.id = a.owner_id
      left join rentals r on r.asset_id = a.id and r.status in ('closed','closed_with_penalty','active')
      group by a.owner_id, u.full_name, u.email
      order by total_revenue_halalas desc
      limit 20
    `);
    res.json(rows.rows);
  })
);

// ── Manual overdue detection trigger ──────────────────────────────────────
router.post(
  "/overdue/detect",
  authenticate,
  requirePermission("operations.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const alertCount = await detectOverdueRentals();
    await recordAudit({
      req,
      action: "admin.overdue_detection",
      entityType: "system",
      after: { alertCount },
    });
    res.json({ alertsCreated: alertCount });
  })
);

// ── Audit log viewer ─────────────────────────────────────────────────────
router.get(
  "/audit-logs",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const entityType = req.query.entityType as string | undefined;

    const conditions = entityType
      ? eq(auditLogs.entityType, entityType)
      : undefined;

    const rows = await db
      .select()
      .from(auditLogs)
      .where(conditions)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    res.json(rows);
  })
);

// ── System alerts summary ────────────────────────────────────────────────
router.get(
  "/alerts/summary",
  authenticate,
  requirePermission("operations.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select type, severity, status, count(*) as count
      from operational_alerts
      group by type, severity, status
      order by count desc
    `);
    res.json(rows.rows);
  })
);

export default router;
