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
import { UserBlockSchema, CreateStaffUserSchema, AuditLogQuerySchema } from "../utils/schemas.js";
import bcrypt from "bcryptjs";

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
    const { reason, block } = UserBlockSchema.parse(req.body);
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
    const { email, fullName, role, password } = CreateStaffUserSchema.parse(req.body);
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
    const filter = AuditLogQuerySchema.parse(req.query);
    const conditions: ReturnType<typeof eq>[] = [];

    if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType));
    if (filter.action) conditions.push(sql`${auditLogs.action} ILIKE ${'%' + filter.action + '%'}`);
    if (filter.actorUserId) conditions.push(eq(auditLogs.actorUserId, filter.actorUserId));

    const rows = await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filter.limit)
      .offset(filter.offset);

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      items: rows,
      total: Number(total?.count ?? 0),
      limit: filter.limit,
      offset: filter.offset,
    });
  })
);

// ── Recalculate a user's trust score from rental history ──────────────────
router.post(
  "/users/:id/recalculate-trust",
  authenticate,
  requirePermission("user.block"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundError("User");

    const stats = await db
      .select({
        completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
        disputed: sql<number>`count(*) filter (where status in ('in_dispute','enforcement'))`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
      })
      .from(rentals)
      .where(eq(rentals.renterId, id));
    const row = stats[0] ?? { completed: 0, disputed: 0, cancelled: 0 };

    const lateReturnRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentals)
      .where(
        and(
          eq(rentals.renterId, id),
          sql`status in ('closed','closed_with_penalty')`,
          sql`returned_at::date > end_date::date`
        )
      );

    const accountAgeDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const completed = Number(row.completed ?? 0);
    const disputed = Number(row.disputed ?? 0);
    const cancelled = Number(row.cancelled ?? 0);
    const lateReturns = Number(lateReturnRows[0]?.count ?? 0);

    let score = 50;
    if (accountAgeDays >= 365) score += 15;
    else if (accountAgeDays >= 90) score += 8;
    else if (accountAgeDays < 30) score -= 10;

    if (completed >= 10) score += 15;
    else if (completed >= 3) score += 8;
    else if (completed === 0) score -= 5;

    if (disputed > 0) score -= 10 * disputed;
    if (lateReturns > 0) score -= 5 * lateReturns;
    if (cancelled >= 3) score -= 8;

    if (user.phoneVerified) score += 2;
    if (user.emailVerified) score += 2;

    score = Math.max(0, Math.min(100, score));
    const riskCategory = score >= 80 ? "low" : score >= 60 ? "medium" : score >= 25 ? "high" : "ultra_high";

    const [updated] = await db
      .update(users)
      .set({ trustScore: score, riskCategory, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    await recordAudit({
      req,
      action: "user.recalculate_trust",
      entityType: "user",
      entityId: id,
      before: { trustScore: user.trustScore, riskCategory: user.riskCategory },
      after: { trustScore: score, riskCategory },
    });

    res.json({ id, trustScore: score, riskCategory, stats: { completed, disputed, cancelled, lateReturns } });
  })
);

export default router;
