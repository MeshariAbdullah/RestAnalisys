/**
 * Admin dashboard routes — financial overview, risk monitoring, user management.
 */

import { Router } from "express";
import { and, desc, eq, gte, lte, inArray, sql } from "drizzle-orm";
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
import { halalasToSar } from "../utils/money.js";

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

// ── Finance export (CSV-style JSON for reconciliation) ────────────────────
router.get(
  "/finance/export",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const from = (req.query.from as string) ?? null;
    const to = (req.query.to as string) ?? null;

    const conditions = [];
    if (from) conditions.push(sql`${rentals.createdAt} >= ${from}::timestamp`);
    if (to) conditions.push(sql`${rentals.createdAt} <= ${to}::timestamp`);

    const rentalRows = await db
      .select({
        reference: rentals.reference,
        status: rentals.status,
        startDate: rentals.startDate,
        endDate: rentals.endDate,
        durationDays: rentals.durationDays,
        rentalSubtotalHalalas: rentals.rentalSubtotalHalalas,
        platformFeeHalalas: rentals.platformFeeHalalas,
        vatHalalas: rentals.vatHalalas,
        totalPayableHalalas: rentals.totalPayableHalalas,
        createdAt: rentals.createdAt,
        closedAt: rentals.closedAt,
      })
      .from(rentals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(rentals.createdAt))
      .limit(5000);

    const paymentRows = await db
      .select({
        rentalReference: rentals.reference,
        paymentType: payments.type,
        paymentStatus: payments.status,
        amountHalalas: payments.amountHalalas,
        gateway: payments.gateway,
        invoiceNumber: payments.invoiceNumber,
        capturedAt: payments.capturedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(rentals, eq(payments.rentalId, rentals.id))
      .orderBy(desc(payments.createdAt))
      .limit(5000);

    const payoutRows = await db
      .select({
        ownerEmail: users.email,
        ownerName: users.fullName,
        grossHalalas: payouts.grossHalalas,
        commissionHalalas: payouts.commissionHalalas,
        netHalalas: payouts.netHalalas,
        status: payouts.status,
        paidAt: payouts.paidAt,
        createdAt: payouts.createdAt,
      })
      .from(payouts)
      .leftJoin(users, eq(payouts.ownerId, users.id))
      .orderBy(desc(payouts.createdAt))
      .limit(5000);

    const summary = {
      totalRentals: rentalRows.length,
      totalRevenueHalalas: rentalRows.reduce((s, r) => s + r.totalPayableHalalas, 0),
      totalPlatformFeeHalalas: rentalRows.reduce((s, r) => s + r.platformFeeHalalas, 0),
      totalVatHalalas: rentalRows.reduce((s, r) => s + r.vatHalalas, 0),
      totalPayoutNetHalalas: payoutRows.reduce((s, p) => s + p.netHalalas, 0),
      totalPayments: paymentRows.length,
      totalPayouts: payoutRows.length,
    };

    await recordAudit({
      req,
      action: "finance.export",
      entityType: "finance",
      after: { from, to, rentalCount: rentalRows.length },
    });

    res.json({
      summary,
      rentals: rentalRows,
      payments: paymentRows,
      payouts: payoutRows,
      exportedAt: new Date().toISOString(),
    });
  })
);

// ── Finance monthly breakdown ─────────────────────────────────────────────
router.get(
  "/finance/monthly",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
             count(*) as rental_count,
             sum(rental_subtotal_halalas) as subtotal_halalas,
             sum(platform_fee_halalas) as platform_fee_halalas,
             sum(vat_halalas) as vat_halalas,
             sum(total_payable_halalas) as total_halalas
      from rentals
      where created_at >= now() - interval '12 months'
      group by 1
      order by 1 desc
    `);
    res.json(rows.rows);
  })
);

export default router;
