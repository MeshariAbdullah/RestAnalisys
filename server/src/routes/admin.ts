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
  legalCommitments,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { generateLegalCommitment } from "../services/legalService.js";

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

// ── Rentals pending manual risk review ────────────────────────────────────
router.get(
  "/risk/pending-review",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        rental: rentals,
        renterName: users.fullName,
        renterEmail: users.email,
        renterTrustScore: users.trustScore,
      })
      .from(rentals)
      .innerJoin(users, eq(rentals.renterId, users.id))
      .where(eq(rentals.status, "pending_risk_review"))
      .orderBy(desc(rentals.createdAt));
    res.json(rows);
  })
);

// ── Admin: approve or reject a risk-flagged rental ────────────────────────
router.post(
  "/risk/review",
  authenticate,
  requirePermission("finance.read"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rentalId, approved, rejectionReason } = req.body as {
      rentalId: number;
      approved: boolean;
      rejectionReason?: string;
    };

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.status !== "pending_risk_review") {
      throw new LegalStateError(`Rental not pending review (status=${rental.status})`);
    }

    if (!approved) {
      const [updated] = await db
        .update(rentals)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: rejectionReason ?? "Rejected by admin risk review",
          updatedAt: new Date(),
        })
        .where(eq(rentals.id, rentalId))
        .returning();

      await db
        .update(assets)
        .set({ status: "listed", updatedAt: new Date() })
        .where(eq(assets.id, rental.assetId));

      await recordAudit({
        req,
        action: "admin.risk_review_reject",
        entityType: "rental",
        entityId: rentalId,
        after: { rejectionReason },
      });

      return res.json(updated);
    }

    // Approved — generate legal commitment and advance to pending_legal_signing
    const [renter] = await db
      .select()
      .from(users)
      .where(eq(users.id, rental.renterId))
      .limit(1);
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, rental.assetId))
      .limit(1);

    const legal = generateLegalCommitment({
      rentalReference: rental.reference,
      renterFullName: renter!.fullName,
      renterNationalId: renter!.nationalId ?? "UNKNOWN",
      assetTitle: asset!.title,
      assetEvaluatedValueHalalas: asset!.evaluatedValueHalalas ?? 0,
      commitmentPct: rental.legalCommitmentPct as 100 | 150,
      commitmentHalalas: rental.legalCommitmentHalalas,
      rentalStartDate: rental.startDate,
      rentalEndDate: rental.endDate,
      rentalTotalHalalas: rental.totalPayableHalalas,
    });

    await db.insert(legalCommitments).values({
      rentalId: rental.id,
      renterId: rental.renterId,
      status: "pending_signature",
      contractVersion: legal.version,
      contractTextHash: legal.textHash,
      clausesJson: legal.clauses as unknown as object,
      commitmentHalalas: rental.legalCommitmentHalalas,
      commitmentPct: rental.legalCommitmentPct,
    });

    const [updated] = await db
      .update(rentals)
      .set({ status: "pending_legal_signing", updatedAt: new Date() })
      .where(eq(rentals.id, rentalId))
      .returning();

    await recordAudit({
      req,
      action: "admin.risk_review_approve",
      entityType: "rental",
      entityId: rentalId,
      after: updated,
    });

    res.json(updated);
  })
);

export default router;
