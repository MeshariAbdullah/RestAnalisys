/**
 * Inspection routes — inspectors create intake and return inspections. Intake
 * inspections set the evaluated value and daily rental price. Return
 * inspections determine the happy-path / damage / loss outcome.
 */

import { Router } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  assets,
  inspections,
  rentals,
  disputes,
} from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { InspectionReportSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

// ── Inspector's work queue ──────────────────────────────────────────────────
router.get(
  "/queue",
  authenticate,
  requirePermission("inspection.create"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: assets.id,
        ownerId: assets.ownerId,
        category: assets.category,
        brand: assets.brand,
        model: assets.model,
        title: assets.title,
        description: assets.description,
        ownerDeclaredValueHalalas: assets.ownerDeclaredValueHalalas,
        evaluatedValueHalalas: assets.evaluatedValueHalalas,
        dailyRentalPriceHalalas: assets.dailyRentalPriceHalalas,
        riskCategory: assets.riskCategory,
        status: assets.status,
        submissionImagesJson: assets.submissionImagesJson,
        studioImagesJson: assets.studioImagesJson,
        attributesJson: assets.attributesJson,
        warehouseLocationCode: assets.warehouseLocationCode,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        rentalId: rentals.id,
      })
      .from(assets)
      .leftJoin(
        rentals,
        eq(assets.id, rentals.assetId)
      )
      .where(inArray(assets.status, ["in_inspection", "returned_under_inspection"]))
      .orderBy(desc(assets.updatedAt));
    res.json(rows);
  })
);

// ── Create an intake inspection report ──────────────────────────────────────
router.post(
  "/intake",
  authenticate,
  requirePermission("inspection.create"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = InspectionReportSchema.parse(req.body);
    if (input.type !== "intake") {
      throw new LegalStateError("Use POST /inspections/return for return inspections");
    }

    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, input.assetId))
      .limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.status !== "in_inspection") {
      throw new LegalStateError(`Asset not in inspection (status=${asset.status})`);
    }

    const [inspection] = await db
      .insert(inspections)
      .values({
        assetId: input.assetId,
        inspectorId: req.user!.userId,
        type: "intake",
        authenticityVerified: input.authenticityVerified,
        authenticityNotes: input.authenticityNotes,
        conditionScore: input.conditionScore,
        conditionGrade: input.conditionGrade,
        conditionNotes: input.conditionNotes,
        marketValueHalalas: input.marketValueHalalas,
        recommendedDailyPriceHalalas: input.recommendedDailyPriceHalalas,
        riskCategory: input.riskCategory,
        beforeImagesJson: input.beforeImages as unknown as object,
        afterImagesJson: input.afterImages as unknown as object,
        checklistJson: input.checklist as object,
      })
      .returning();

    await db
      .update(assets)
      .set({ status: "inspection_reported", updatedAt: new Date() })
      .where(eq(assets.id, input.assetId));

    await recordAudit({
      req,
      action: "inspection.intake_created",
      entityType: "inspection",
      entityId: inspection.id,
      after: inspection,
    });

    res.status(201).json(inspection);
  })
);

// ── Create a return inspection report ───────────────────────────────────────
router.post(
  "/return",
  authenticate,
  requirePermission("inspection.create"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = InspectionReportSchema.parse(req.body);
    if (input.type !== "return" || !input.rentalId) {
      throw new LegalStateError("Return inspection requires rentalId");
    }

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.status !== "under_inspection") {
      throw new LegalStateError(`Rental not under inspection (status=${rental.status})`);
    }

    const [inspection] = await db
      .insert(inspections)
      .values({
        assetId: rental.assetId,
        rentalId: rental.id,
        inspectorId: req.user!.userId,
        type: "return",
        authenticityVerified: input.authenticityVerified,
        authenticityNotes: input.authenticityNotes,
        conditionScore: input.conditionScore,
        conditionGrade: input.conditionGrade,
        conditionNotes: input.conditionNotes,
        marketValueHalalas: input.marketValueHalalas,
        recommendedDailyPriceHalalas: input.recommendedDailyPriceHalalas,
        riskCategory: input.riskCategory,
        beforeImagesJson: input.beforeImages as unknown as object,
        afterImagesJson: input.afterImages as unknown as object,
        checklistJson: input.checklist as object,
      })
      .returning();

    await recordAudit({
      req,
      action: "inspection.return_created",
      entityType: "inspection",
      entityId: inspection.id,
      after: inspection,
    });

    // Interpret outcome by condition grade — the actual rental closing is done
    // via POST /rentals/:id/close which reads this inspection.
    res.status(201).json({
      inspection,
      hint: "Call POST /rentals/:id/close with outcome=clean|penalty|major_damage",
    });
  })
);

// ── View an inspection by id ────────────────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  requirePermission("inspection.read"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [row] = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
    if (!row) throw new NotFoundError("Inspection");
    res.json(row);
  })
);

// ── Asset inspection history ───────────────────────────────────────────────
router.get(
  "/asset/:assetId",
  authenticate,
  requirePermission("inspection.read"),
  asyncHandler(async (req, res) => {
    const assetId = Number(req.params.assetId);
    const rows = await db
      .select()
      .from(inspections)
      .where(eq(inspections.assetId, assetId))
      .orderBy(desc(inspections.createdAt));
    res.json(rows);
  })
);

export default router;
