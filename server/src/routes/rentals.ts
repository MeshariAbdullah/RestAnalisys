/**
 * Rental routes — the heart of the platform.
 *
 * Lifecycle covered here:
 *   quote                  → GET /rentals/quote
 *   create                 → POST /rentals            (runs risk engine)
 *   sign legal             → POST /rentals/:id/legal/sign
 *   pay                    → POST /rentals/:id/pay
 *   fulfill (ops)          → POST /rentals/:id/fulfill
 *   deliver (ops)          → POST /rentals/:id/delivered
 *   mark returned (ops)    → POST /rentals/:id/returned
 *   close                  → POST /rentals/:id/close  (reads return inspection)
 *   cancel                 → POST /rentals/:id/cancel
 *
 * Notes:
 *  - Every creation runs the Risk Engine to decide 100% vs 150% legal
 *    commitment and whether the user is even eligible.
 *  - The legal contract is between the PLATFORM and the RENTER (not the owner).
 *  - The rental is locked in halalas and never recalculated after creation.
 */

import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  assets,
  rentals,
  users,
  riskScores,
  legalCommitments,
  sanadRecords,
  payments,
  inspections,
  shipments,
  operationalAlerts,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission, requireNafath } from "../middleware/rbac.js";
import {
  RentalQuoteRequestSchema,
  RentalCreateSchema,
  RentalCancelSchema,
} from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  NotFoundError,
  LegalStateError,
  RiskRejectionError,
  ForbiddenError,
} from "../utils/errors.js";
import {
  computeRentalQuote,
  DEFAULT_PLATFORM_FEE_PCT,
} from "../utils/money.js";
import { computeRiskDecision, RiskFeatures } from "../services/riskEngine.js";
import { generateLegalCommitment } from "../services/legalService.js";
import { issueSanad } from "../services/nafithService.js";
import { recordAudit } from "../services/auditService.js";
import { computePenalty, getDamageRules } from "../services/damageMatrix.js";
import { sendNotification } from "../services/notificationService.js";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T00:00:00Z").getTime();
  const end = new Date(endIso + "T00:00:00Z").getTime();
  if (end <= start) throw new LegalStateError("endDate must be after startDate");
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function generateRentalReference(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `MLR-${year}-${rand}`;
}

async function buildRiskFeatures(userId: number, assetValueHalalas: number): Promise<RiskFeatures> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User");

  const stats = await db
    .select({
      completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
      disputed: sql<number>`count(*) filter (where status in ('in_dispute','enforcement'))`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
      lateReturns: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty','under_inspection') and returned_at is not null and returned_at::date > end_date::date)`,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId));
  const row = stats[0] ?? { completed: 0, disputed: 0, cancelled: 0, lateReturns: 0 };

  const accountAgeDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    accountAgeDays,
    completedRentals: Number(row.completed ?? 0),
    disputedRentals: Number(row.disputed ?? 0),
    cancelledRentals: Number(row.cancelled ?? 0),
    lateReturns: Number(row.lateReturns ?? 0),
    nafathVerified: user.nafathVerified,
    kycVerified: user.kycStatus === "verified",
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    priorBlock: user.isBlocked,
    requestedAssetValueHalalas: assetValueHalalas,
    userRole: user.role,
    countryIsSaudi: true,
  };
}

// ── Quote (no side effects) ─────────────────────────────────────────────────
router.get(
  "/quote",
  asyncHandler(async (req, res) => {
    const input = RentalQuoteRequestSchema.parse(req.query);
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, input.assetId))
      .limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.status !== "listed")
      throw new LegalStateError(`Asset not listed (status=${asset.status})`);

    const durationDays = daysBetween(input.startDate, input.endDate);
    const quote = computeRentalQuote({
      dailyPriceHalalas: asset.dailyRentalPriceHalalas ?? 0,
      durationDays,
    });

    res.json({
      assetId: asset.id,
      assetTitle: asset.title,
      evaluatedValueHalalas: asset.evaluatedValueHalalas,
      ...quote,
    });
  })
);

// ── Create rental (runs risk engine, produces legal commitment + Sanad) ────
router.post(
  "/",
  authenticate,
  requirePermission("rental.create"),
  requireNafath,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = RentalCreateSchema.parse(req.body);
    const renterId = req.user!.userId;

    const [asset] = await db.select().from(assets).where(eq(assets.id, input.assetId)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.status !== "listed")
      throw new LegalStateError(`Asset not available (status=${asset.status})`);
    if (asset.ownerId === renterId)
      throw new LegalStateError("Cannot rent your own asset");

    // Risk engine ----------------------------------------------------------
    const features = await buildRiskFeatures(renterId, asset.evaluatedValueHalalas ?? 0);
    const decision = computeRiskDecision(features);

    if (!decision.approved) {
      await db.insert(riskScores).values({
        userId: renterId,
        accountAgeDays: features.accountAgeDays,
        completedRentals: features.completedRentals,
        disputedRentals: features.disputedRentals,
        cancelledRentals: features.cancelledRentals,
        lateReturns: features.lateReturns,
        nafathVerified: features.nafathVerified,
        baseScore: decision.baseScore,
        modifiersJson: decision.modifiers as unknown as object,
        finalScore: decision.finalScore,
        riskCategory: decision.riskCategory,
        approved: false,
        rejectionReason: decision.rejectionReason,
        legalCommitmentPct: 0,
        legalCommitmentHalalas: 0,
      });
      throw new RiskRejectionError(
        decision.rejectionReason ?? "Risk engine rejected this attempt",
        decision
      );
    }

    // Pricing snapshot -----------------------------------------------------
    const durationDays = daysBetween(input.startDate, input.endDate);
    const quote = computeRentalQuote({
      dailyPriceHalalas: asset.dailyRentalPriceHalalas ?? 0,
      durationDays,
    });

    // Rental row -----------------------------------------------------------
    const reference = generateRentalReference();
    const [rental] = await db
      .insert(rentals)
      .values({
        reference,
        assetId: asset.id,
        renterId,
        ownerId: asset.ownerId,
        status: "pending_legal_signing",
        startDate: input.startDate,
        endDate: input.endDate,
        durationDays,
        dailyPriceHalalas: quote.dailyPriceHalalas,
        rentalSubtotalHalalas: quote.rentalSubtotalHalalas,
        platformFeeHalalas: quote.platformFeeHalalas,
        vatHalalas: quote.vatHalalas,
        totalPayableHalalas: quote.totalPayableHalalas,
        trustScoreAtBooking: decision.finalScore,
        riskSnapshotJson: decision as unknown as object,
        legalCommitmentPct: decision.legalCommitmentPct!,
        legalCommitmentHalalas: decision.legalCommitmentHalalas,
        deliveryAddressJson: (input.deliveryAddress as unknown as object) ?? null,
      })
      .returning();

    // Reserve the asset
    await db
      .update(assets)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(eq(assets.id, asset.id));

    // Persist the risk score row now that we have rental_id
    await db.insert(riskScores).values({
      userId: renterId,
      rentalId: rental.id,
      accountAgeDays: features.accountAgeDays,
      completedRentals: features.completedRentals,
      disputedRentals: features.disputedRentals,
      cancelledRentals: features.cancelledRentals,
      lateReturns: features.lateReturns,
      nafathVerified: features.nafathVerified,
      baseScore: decision.baseScore,
      modifiersJson: decision.modifiers as unknown as object,
      finalScore: decision.finalScore,
      riskCategory: decision.riskCategory,
      approved: true,
      legalCommitmentPct: decision.legalCommitmentPct!,
      legalCommitmentHalalas: decision.legalCommitmentHalalas,
    });

    // Generate legal commitment draft --------------------------------------
    const [renter] = await db.select().from(users).where(eq(users.id, renterId)).limit(1);
    const legal = generateLegalCommitment({
      rentalReference: rental.reference,
      renterFullName: renter!.fullName,
      renterNationalId: renter!.nationalId ?? "UNKNOWN",
      assetTitle: asset.title,
      assetEvaluatedValueHalalas: asset.evaluatedValueHalalas ?? 0,
      commitmentPct: decision.legalCommitmentPct!,
      commitmentHalalas: decision.legalCommitmentHalalas,
      rentalStartDate: input.startDate,
      rentalEndDate: input.endDate,
      rentalTotalHalalas: quote.totalPayableHalalas,
    });

    const [legalCommitment] = await db
      .insert(legalCommitments)
      .values({
        rentalId: rental.id,
        renterId,
        status: "pending_signature",
        contractVersion: legal.version,
        contractTextHash: legal.textHash,
        clausesJson: legal.clauses as unknown as object,
        commitmentHalalas: decision.legalCommitmentHalalas,
        commitmentPct: decision.legalCommitmentPct!,
      })
      .returning();

    await recordAudit({
      req,
      action: "rental.create",
      entityType: "rental",
      entityId: rental.id,
      after: { rental, decision },
    });

    sendNotification({
      userId: renterId,
      type: "rental.created",
      vars: { reference: rental.reference, assetTitle: asset.title },
      entityType: "rental",
      entityId: rental.id,
    });
    sendNotification({
      userId: asset.ownerId,
      type: "asset.rented",
      vars: { reference: rental.reference, assetTitle: asset.title },
      entityType: "rental",
      entityId: rental.id,
    });

    res.status(201).json({
      rental,
      risk: decision,
      legal: {
        commitmentId: legalCommitment.id,
        status: legalCommitment.status,
        clauses: legal.clauses,
        textHash: legal.textHash,
        commitmentHalalas: decision.legalCommitmentHalalas,
        commitmentPct: decision.legalCommitmentPct,
      },
      quote,
    });
  })
);

// ── Renter: view own rental ─────────────────────────────────────────────────
router.get(
  "/mine",
  authenticate,
  requirePermission("rental.read.own"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(rentals)
      .where(eq(rentals.renterId, req.user!.userId))
      .orderBy(desc(rentals.createdAt));
    res.json(rows);
  })
);

// ── Admin/Ops: list all rentals ─────────────────────────────────────────────
router.get(
  "/",
  authenticate,
  requirePermission("rental.read.any"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(rentals)
      .orderBy(desc(rentals.createdAt))
      .limit(200);
    res.json(rows);
  })
);

// ── View a single rental (respects ownership) ──────────────────────────────
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");

    const canReadAny = ["admin", "super_admin", "operations", "inspector"].includes(
      req.user!.role
    );
    if (
      !canReadAny &&
      rental.renterId !== req.user!.userId &&
      rental.ownerId !== req.user!.userId
    ) {
      throw new ForbiddenError();
    }

    const [legal] = await db
      .select()
      .from(legalCommitments)
      .where(eq(legalCommitments.rentalId, id))
      .limit(1);
    const [sanad] = await db
      .select()
      .from(sanadRecords)
      .where(eq(sanadRecords.rentalId, id))
      .limit(1);
    const pays = await db
      .select()
      .from(payments)
      .where(eq(payments.rentalId, id))
      .orderBy(desc(payments.createdAt));

    res.json({ rental, legal, sanad, payments: pays });
  })
);

// ── Ops: mark fulfilled (scheduled delivery) ───────────────────────────────
router.post(
  "/:id/fulfill",
  authenticate,
  requirePermission("rental.fulfill"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.status !== "confirmed") {
      throw new LegalStateError(`Expected confirmed, got ${rental.status}`);
    }

    const [updated] = await db
      .update(rentals)
      .set({ status: "out_for_delivery", updatedAt: new Date() })
      .where(eq(rentals.id, id))
      .returning();

    await db.insert(shipments).values({
      assetId: rental.assetId,
      rentalId: rental.id,
      direction: "platform_to_renter",
      status: "scheduled",
      toAddressJson: rental.deliveryAddressJson as object,
    });

    await recordAudit({
      req,
      action: "rental.fulfill",
      entityType: "rental",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

// ── Ops: mark delivered (with the renter) ──────────────────────────────────
router.post(
  "/:id/delivered",
  authenticate,
  requirePermission("rental.fulfill"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.status !== "out_for_delivery") {
      throw new LegalStateError(`Expected out_for_delivery, got ${rental.status}`);
    }

    const [updated] = await db
      .update(rentals)
      .set({
        status: "active",
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rentals.id, id))
      .returning();

    await db
      .update(assets)
      .set({ status: "rented_out", updatedAt: new Date() })
      .where(eq(assets.id, rental.assetId));

    await recordAudit({
      req,
      action: "rental.delivered",
      entityType: "rental",
      entityId: id,
      after: updated,
    });

    sendNotification({
      userId: rental.renterId,
      type: "rental.delivered",
      vars: { reference: rental.reference },
      entityType: "rental",
      entityId: id,
    });

    res.json(updated);
  })
);

// ── Ops: mark as returned (triggers inspection) ────────────────────────────
router.post(
  "/:id/returned",
  authenticate,
  requirePermission("rental.fulfill"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.status !== "active" && rental.status !== "return_in_transit") {
      throw new LegalStateError(`Expected active/return_in_transit, got ${rental.status}`);
    }

    const [updated] = await db
      .update(rentals)
      .set({ status: "under_inspection", returnedAt: new Date(), updatedAt: new Date() })
      .where(eq(rentals.id, id))
      .returning();

    await db
      .update(assets)
      .set({ status: "returned_under_inspection", updatedAt: new Date() })
      .where(eq(assets.id, rental.assetId));

    await recordAudit({
      req,
      action: "rental.returned",
      entityType: "rental",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

// ── Ops/Admin: close a rental after return inspection ──────────────────────
router.post(
  "/:id/close",
  authenticate,
  requirePermission("rental.close"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { outcome, penaltyHalalas } = req.body as {
      outcome: "clean" | "penalty" | "major_damage" | "loss";
      penaltyHalalas?: number;
    };

    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.status !== "under_inspection") {
      throw new LegalStateError(`Expected under_inspection, got ${rental.status}`);
    }

    if (outcome === "clean") {
      const [updated] = await db
        .update(rentals)
        .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
        .where(eq(rentals.id, id))
        .returning();
      await db
        .update(assets)
        .set({ status: "listed", updatedAt: new Date() })
        .where(eq(assets.id, rental.assetId));
      await recordAudit({
        req,
        action: "rental.close_clean",
        entityType: "rental",
        entityId: id,
        after: updated,
      });
      sendNotification({
        userId: rental.renterId,
        type: "rental.closed",
        vars: { reference: rental.reference },
        entityType: "rental",
        entityId: id,
      });
      return res.json(updated);
    }

    if (outcome === "penalty") {
      const [updated] = await db
        .update(rentals)
        .set({
          status: "closed_with_penalty",
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(rentals.id, id))
        .returning();
      await db.insert(payments).values({
        rentalId: id,
        userId: rental.renterId,
        type: "penalty",
        status: "pending",
        amountHalalas: penaltyHalalas ?? 0,
      });
      await db
        .update(assets)
        .set({ status: "listed", updatedAt: new Date() })
        .where(eq(assets.id, rental.assetId));
      await recordAudit({
        req,
        action: "rental.close_penalty",
        entityType: "rental",
        entityId: id,
        after: { updated, penaltyHalalas },
      });
      return res.json(updated);
    }

    // Major damage or loss → enforcement
    const [updated] = await db
      .update(rentals)
      .set({ status: "enforcement", updatedAt: new Date() })
      .where(eq(rentals.id, id))
      .returning();

    await db
      .update(assets)
      .set({
        status: outcome === "loss" ? "lost_or_destroyed" : "returned_under_inspection",
        updatedAt: new Date(),
      })
      .where(eq(assets.id, rental.assetId));

    await db.insert(operationalAlerts).values({
      type: "sanad_execution_required",
      severity: "critical",
      subjectType: "rental",
      subjectId: id,
      message: `Rental ${rental.reference} requires Sanad execution for ${outcome}.`,
      payloadJson: { outcome, rentalId: id },
    });

    await recordAudit({
      req,
      action: "rental.close_enforcement",
      entityType: "rental",
      entityId: id,
      after: { updated, outcome },
    });

    res.json(updated);
  })
);

// ── Damage rules reference ─────────────────────────────────────────────────
router.get(
  "/damage-rules",
  asyncHandler(async (_req, res) => {
    res.json(getDamageRules());
  })
);

// ── Calculate penalty for a rental ────────────────────────────────────────
router.post(
  "/:id/calculate-penalty",
  authenticate,
  requirePermission("rental.close"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { conditionScoreAfter, damageLevel } = req.body as {
      conditionScoreAfter?: number;
      damageLevel?: string;
    };

    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");

    const [asset] = await db.select().from(assets).where(eq(assets.id, rental.assetId)).limit(1);
    if (!asset) throw new NotFoundError("Asset");

    const [intakeInspection] = await db
      .select()
      .from(inspections)
      .where(and(eq(inspections.assetId, rental.assetId), eq(inspections.type, "intake")))
      .orderBy(desc(inspections.createdAt))
      .limit(1);

    const conditionScoreBefore = intakeInspection?.conditionScore ?? 100;
    const endDate = new Date(rental.endDate + "T00:00:00Z");
    const returnDate = rental.returnedAt ?? new Date();
    const lateDays = Math.max(
      0,
      Math.floor((new Date(returnDate).getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const penalty = computePenalty({
      assetValueHalalas: asset.evaluatedValueHalalas ?? 0,
      conditionScoreBefore,
      conditionScoreAfter: conditionScoreAfter ?? conditionScoreBefore,
      lateDays,
      damageLevel: damageLevel as any,
    });

    res.json(penalty);
  })
);

// ── Renter: cancel before confirmation ─────────────────────────────────────
router.post(
  "/:id/cancel",
  authenticate,
  requirePermission("rental.cancel"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { reason } = RentalCancelSchema.parse(req.body);

    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id)).limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.renterId !== req.user!.userId && req.user!.role !== "admin") {
      throw new ForbiddenError();
    }
    if (!["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(rental.status)) {
      throw new LegalStateError(`Cannot cancel rental in status ${rental.status}`);
    }

    const [updated] = await db
      .update(rentals)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(rentals.id, id))
      .returning();

    await db
      .update(assets)
      .set({ status: "listed", updatedAt: new Date() })
      .where(eq(assets.id, rental.assetId));

    await recordAudit({
      req,
      action: "rental.cancel",
      entityType: "rental",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

export default router;
