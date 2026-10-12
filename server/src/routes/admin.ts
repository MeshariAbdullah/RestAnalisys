/**
 * Admin dashboard routes — financial overview, risk monitoring, user management.
 */

import { Router } from "express";
import bcrypt from "bcryptjs";
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
import { AuditLogFilterSchema } from "../utils/schemas.js";
import { recordAudit } from "../services/auditService.js";
import { getRecentNotifications } from "../services/notificationService.js";

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
    const { email, fullName, role, password } = req.body as {
      email: string;
      fullName: string;
      role: "admin" | "operations" | "inspector";
      password: string;
    };
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
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

// ── Audit log viewer ──────────────────────────────────────────────────────
router.get(
  "/audit-logs",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const filter = AuditLogFilterSchema.parse(req.query);
    const conditions: ReturnType<typeof eq>[] = [];

    if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType));
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
    if (filter.actorUserId) conditions.push(eq(auditLogs.actorUserId, filter.actorUserId));
    if (filter.from) conditions.push(sql`${auditLogs.createdAt} >= ${filter.from}::date`);
    if (filter.to) conditions.push(sql`${auditLogs.createdAt} < (${filter.to}::date + interval '1 day')`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filter.limit)
      .offset(filter.offset);

    res.json({
      total: Number(total?.count ?? 0),
      limit: filter.limit,
      offset: filter.offset,
      rows,
    });
  })
);

// ── Notification log (recent stub notifications) ──────────────────────────
router.get(
  "/notifications/log",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (_req, res) => {
    res.json(getRecentNotifications());
  })
);

// ── Platform-wide stats ──────────────────────────────────────────────────
router.get(
  "/stats",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const [totalRentals] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentals);

    const statusBreakdown = await db
      .select({ status: rentals.status, count: sql<number>`count(*)` })
      .from(rentals)
      .groupBy(rentals.status);

    const [avgRentalValue] = await db
      .select({ avg: sql<string>`coalesce(avg(total_payable_halalas), 0)` })
      .from(rentals)
      .where(inArray(rentals.status, ["closed", "closed_with_penalty", "active"]));

    const usersByRole = await db
      .select({ role: users.role, count: sql<number>`count(*)` })
      .from(users)
      .groupBy(users.role);

    const assetsByCategory = await db
      .select({ category: assets.category, count: sql<number>`count(*)` })
      .from(assets)
      .groupBy(assets.category);

    res.json({
      totalRentals: Number(totalRentals?.count ?? 0),
      rentalsByStatus: statusBreakdown.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      avgRentalValueHalalas: Math.round(Number(avgRentalValue?.avg ?? 0)),
      usersByRole: usersByRole.map((r) => ({
        role: r.role,
        count: Number(r.count),
      })),
      assetsByCategory: assetsByCategory.map((r) => ({
        category: r.category,
        count: Number(r.count),
      })),
    });
  })
);

export default router;
