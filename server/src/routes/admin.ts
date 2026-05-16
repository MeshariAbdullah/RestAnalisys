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
  payouts,
  disputes,
  sanadRecords,
  riskScores,
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

// ── Asset category breakdown ──────────────────────────────────────────────
router.get(
  "/analytics/categories",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      SELECT category,
             count(*) as total,
             count(*) FILTER (WHERE status = 'listed') as listed,
             count(*) FILTER (WHERE status = 'rented_out') as rented,
             COALESCE(AVG(daily_rental_price_halalas) FILTER (WHERE daily_rental_price_halalas > 0), 0) as avg_daily_price_halalas,
             COALESCE(SUM(evaluated_value_halalas), 0) as total_value_halalas
      FROM assets
      GROUP BY category
      ORDER BY total DESC
    `);
    res.json(rows.rows);
  })
);

// ── User growth over time ─────────────────────────────────────────────────
router.get(
  "/analytics/user-growth",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
             count(*) as new_users,
             count(*) FILTER (WHERE role = 'renter') as new_renters,
             count(*) FILTER (WHERE role = 'owner') as new_owners
      FROM users
      WHERE created_at >= now() - interval '90 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    res.json(rows.rows);
  })
);

// ── Rental conversion funnel ──────────────────────────────────────────────
router.get(
  "/analytics/funnel",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      SELECT
        count(*) as total_rentals,
        count(*) FILTER (WHERE status != 'cancelled') as past_risk,
        count(*) FILTER (WHERE status NOT IN ('cancelled', 'pending_legal_signing', 'pending_risk_review')) as signed,
        count(*) FILTER (WHERE status NOT IN ('cancelled', 'pending_legal_signing', 'pending_risk_review', 'pending_payment')) as paid,
        count(*) FILTER (WHERE status IN ('active', 'return_in_transit', 'under_inspection', 'closed', 'closed_with_penalty')) as fulfilled,
        count(*) FILTER (WHERE status IN ('closed', 'closed_with_penalty')) as completed,
        count(*) FILTER (WHERE status = 'cancelled') as cancelled,
        count(*) FILTER (WHERE status IN ('in_dispute', 'enforcement')) as disputed
      FROM rentals
      WHERE created_at >= now() - interval '30 days'
    `);
    res.json(rows.rows[0] ?? {});
  })
);

// ── Platform financial summary ────────────────────────────────────────────
router.get(
  "/analytics/financial-summary",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const inventory = await db.execute(sql`
      SELECT COALESCE(SUM(evaluated_value_halalas), 0) as total_inventory_value_halalas,
             count(*) as total_assets
      FROM assets
      WHERE status NOT IN ('withdrawn', 'lost_or_destroyed', 'rejected')
    `);

    const revenue = await db.execute(sql`
      SELECT
        COALESCE(SUM(total_payable_halalas) FILTER (WHERE status IN ('closed', 'closed_with_penalty')), 0) as total_revenue_halalas,
        COALESCE(SUM(platform_fee_halalas) FILTER (WHERE status IN ('closed', 'closed_with_penalty')), 0) as total_platform_fee_halalas,
        COALESCE(SUM(vat_halalas) FILTER (WHERE status IN ('closed', 'closed_with_penalty')), 0) as total_vat_collected_halalas,
        COALESCE(AVG(total_payable_halalas) FILTER (WHERE status NOT IN ('cancelled')), 0) as avg_rental_value_halalas,
        COALESCE(AVG(duration_days) FILTER (WHERE status NOT IN ('cancelled')), 0) as avg_rental_duration_days
      FROM rentals
    `);

    const payoutStats = await db.execute(sql`
      SELECT
        COALESCE(SUM(net_halalas), 0) as total_paid_out_halalas,
        count(*) FILTER (WHERE status = 'pending') as pending_payouts,
        COALESCE(SUM(net_halalas) FILTER (WHERE status = 'pending'), 0) as pending_payout_halalas
      FROM payouts
    `);

    res.json({
      inventory: inventory.rows[0],
      revenue: revenue.rows[0],
      payouts: payoutStats.rows[0],
    });
  })
);

// ── Audit log viewer ──────────────────────────────────────────────────────
router.get(
  "/audit-log",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const entityType = req.query.entityType as string | undefined;
    const action = req.query.action as string | undefined;

    let query = sql`
      SELECT al.*, u.email as actor_email, u.full_name as actor_name
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE 1=1
    `;

    if (entityType) query = sql`${query} AND al.entity_type = ${entityType}`;
    if (action) query = sql`${query} AND al.action LIKE ${`%${action}%`}`;

    query = sql`${query} ORDER BY al.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const rows = await db.execute(query);
    res.json({ items: rows.rows, limit, offset });
  })
);

export default router;
