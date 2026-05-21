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
  auditLogs,
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

// ── Audit trail ───────────────────────────────────────────────────────────
router.get(
  "/audit-logs",
  authenticate,
  requirePermission("system.audit"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const entityType = req.query.entityType as string | undefined;
    const action = req.query.action as string | undefined;
    const actorId = req.query.actorId ? Number(req.query.actorId) : undefined;

    const conditions = [];
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (action) conditions.push(sql`action like ${"%" + action + "%"}`);
    if (actorId) conditions.push(eq(auditLogs.actorUserId, actorId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const rows = await db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      items: rows,
      total: Number(totalResult?.count ?? 0),
      page,
      pageSize: limit,
      totalPages: Math.ceil(Number(totalResult?.count ?? 0) / limit),
    });
  })
);

// ── CSV export: financial transactions ────────────────────────────────────
router.get(
  "/export/financial",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (from) conditions.push(sql`p.created_at >= ${from}::timestamp`);
    if (to) conditions.push(sql`p.created_at <= ${to}::timestamp`);

    const whereSQL =
      conditions.length > 0
        ? sql`where ${sql.join(conditions, sql` and `)}`
        : sql``;

    const rows = await db.execute(sql`
      select
        p.id,
        p.type,
        p.status,
        p.amount_halalas,
        p.currency,
        p.gateway,
        p.gateway_transaction_id,
        p.invoice_number,
        p.created_at,
        r.reference as rental_reference,
        u.email as user_email,
        u.full_name as user_name
      from payments p
      left join rentals r on p.rental_id = r.id
      left join users u on p.user_id = u.id
      ${whereSQL}
      order by p.created_at desc
      limit 5000
    `);

    const header =
      "id,type,status,amount_sar,currency,gateway,transaction_id,invoice_number,rental_reference,user_email,user_name,created_at";
    const csvRows = (rows.rows as any[]).map((r) => {
      const amountSar = halalasToSar(Number(r.amount_halalas));
      return [
        r.id,
        r.type,
        r.status,
        amountSar.toFixed(2),
        r.currency,
        r.gateway,
        r.gateway_transaction_id ?? "",
        r.invoice_number ?? "",
        r.rental_reference ?? "",
        r.user_email ?? "",
        `"${(r.user_name ?? "").replace(/"/g, '""')}"`,
        r.created_at,
      ].join(",");
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mlr-financial-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send([header, ...csvRows].join("\n"));
  })
);

// ── CSV export: payouts ───────────────────────────────────────────────────
router.get(
  "/export/payouts",
  authenticate,
  requirePermission("finance.export"),
  asyncHandler(async (_req, res) => {
    const rows = await db.execute(sql`
      select
        po.id,
        po.status,
        po.gross_halalas,
        po.commission_halalas,
        po.net_halalas,
        po.iban,
        po.reference,
        po.created_at,
        po.paid_at,
        u.email as owner_email,
        u.full_name as owner_name,
        r.reference as rental_reference
      from payouts po
      left join users u on po.owner_id = u.id
      left join rentals r on po.rental_id = r.id
      order by po.created_at desc
      limit 5000
    `);

    const header =
      "id,status,gross_sar,commission_sar,net_sar,iban,reference,owner_email,owner_name,rental_reference,created_at,paid_at";
    const csvRows = (rows.rows as any[]).map((r) => {
      return [
        r.id,
        r.status,
        halalasToSar(Number(r.gross_halalas)).toFixed(2),
        halalasToSar(Number(r.commission_halalas)).toFixed(2),
        halalasToSar(Number(r.net_halalas)).toFixed(2),
        r.iban ?? "",
        r.reference ?? "",
        r.owner_email ?? "",
        `"${(r.owner_name ?? "").replace(/"/g, '""')}"`,
        r.rental_reference ?? "",
        r.created_at,
        r.paid_at ?? "",
      ].join(",");
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mlr-payouts-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send([header, ...csvRows].join("\n"));
  })
);

export default router;
