/**
 * Asset routes — owner submission, admin approval, public listing, and the
 * owner approval of inspector valuations.
 *
 * Business rules enforced here:
 *  - Owners can only submit assets (not auto-list them).
 *  - Admins approve/reject submissions.
 *  - Inspectors attach the valuation via /inspections — this route exposes the
 *    owner's accept/reject decision that flips status to ready_for_listing.
 *  - Only assets in status ready_for_listing can be published to the catalog.
 */

import { Router } from "express";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { assets, inspections, users, inventoryMovements } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  AssetSubmissionSchema,
  AssetApprovalSchema,
  AssetListingFilter,
} from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ForbiddenError, NotFoundError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { notify } from "../services/notificationService.js";

const router = Router();

// ── Owner: submit a new asset for evaluation ────────────────────────────────
router.post(
  "/",
  authenticate,
  requirePermission("asset.submit"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = AssetSubmissionSchema.parse(req.body);
    const ownerId = req.user!.userId;

    const [asset] = await db
      .insert(assets)
      .values({
        ownerId,
        category: input.category,
        brand: input.brand,
        model: input.model,
        title: input.title,
        description: input.description,
        ownerDeclaredValueHalalas: input.ownerDeclaredValueHalalas,
        submissionImagesJson: input.submissionImages as unknown as object,
        attributesJson: (input.attributes as object) ?? {},
        status: "pending_approval",
      })
      .returning();

    await recordAudit({
      req,
      action: "asset.submit",
      entityType: "asset",
      entityId: asset.id,
      after: { title: asset.title, brand: asset.brand },
    });

    res.status(201).json(asset);
  })
);

// ── Owner: list my assets ───────────────────────────────────────────────────
router.get(
  "/mine",
  authenticate,
  requirePermission("asset.read.own"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.ownerId, req.user!.userId))
      .orderBy(desc(assets.createdAt));
    res.json(rows);
  })
);

// ── Owner: withdraw an asset ────────────────────────────────────────────────
router.post(
  "/:id/withdraw",
  authenticate,
  requirePermission("asset.withdraw"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.ownerId !== req.user!.userId) throw new ForbiddenError("Not your asset");
    if (["rented_out", "reserved", "in_inspection"].includes(asset.status)) {
      throw new LegalStateError(
        `Cannot withdraw while status is ${asset.status}. Wait until the current cycle closes.`
      );
    }

    const [updated] = await db
      .update(assets)
      .set({ status: "withdrawn", withdrawnAt: new Date(), updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();

    await recordAudit({
      req,
      action: "asset.withdraw",
      entityType: "asset",
      entityId: id,
      before: asset,
      after: updated,
    });

    res.json(updated);
  })
);

// ── Owner: respond to inspector's valuation ─────────────────────────────────
router.post(
  "/:id/valuation-response",
  authenticate,
  requirePermission("asset.read.own"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { approved, rejectionReason } = req.body as {
      approved: boolean;
      rejectionReason?: string;
    };

    const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.ownerId !== req.user!.userId) throw new ForbiddenError();
    if (asset.status !== "inspection_reported") {
      throw new LegalStateError("No pending valuation to respond to");
    }

    const [latestInspection] = await db
      .select()
      .from(inspections)
      .where(and(eq(inspections.assetId, id), eq(inspections.type, "intake")))
      .orderBy(desc(inspections.createdAt))
      .limit(1);
    if (!latestInspection) throw new NotFoundError("Inspection");

    if (approved) {
      await db
        .update(inspections)
        .set({ ownerApproved: true, ownerApprovedAt: new Date() })
        .where(eq(inspections.id, latestInspection.id));

      const [updated] = await db
        .update(assets)
        .set({
          status: "ready_for_listing",
          evaluatedValueHalalas: latestInspection.marketValueHalalas,
          dailyRentalPriceHalalas: latestInspection.recommendedDailyPriceHalalas,
          riskCategory: latestInspection.riskCategory,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, id))
        .returning();

      await recordAudit({
        req,
        action: "asset.owner_approved_valuation",
        entityType: "asset",
        entityId: id,
        after: updated,
      });

      res.json(updated);
    } else {
      await db
        .update(inspections)
        .set({
          ownerApproved: false,
          ownerRejectedAt: new Date(),
          ownerRejectionReason: rejectionReason,
        })
        .where(eq(inspections.id, latestInspection.id));

      const [updated] = await db
        .update(assets)
        .set({ status: "owner_rejected_valuation", updatedAt: new Date() })
        .where(eq(assets.id, id))
        .returning();

      await recordAudit({
        req,
        action: "asset.owner_rejected_valuation",
        entityType: "asset",
        entityId: id,
        after: { rejectionReason },
      });

      res.json(updated);
    }
  })
);

// ── Admin: pending approvals queue ──────────────────────────────────────────
router.get(
  "/pending",
  authenticate,
  requirePermission("asset.approve"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: assets.id,
        title: assets.title,
        brand: assets.brand,
        category: assets.category,
        ownerDeclaredValueHalalas: assets.ownerDeclaredValueHalalas,
        submissionImagesJson: assets.submissionImagesJson,
        createdAt: assets.createdAt,
        ownerId: assets.ownerId,
        ownerName: users.fullName,
      })
      .from(assets)
      .leftJoin(users, eq(assets.ownerId, users.id))
      .where(eq(assets.status, "pending_approval"))
      .orderBy(asc(assets.createdAt));
    res.json(rows);
  })
);

// ── Admin: approve / reject a submission ────────────────────────────────────
router.post(
  "/review",
  authenticate,
  requirePermission("asset.approve"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { assetId, approved, rejectionReason } = AssetApprovalSchema.parse(req.body);

    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.status !== "pending_approval") {
      throw new LegalStateError(`Asset is in status ${asset.status}, not pending_approval`);
    }

    const [updated] = await db
      .update(assets)
      .set({
        status: approved ? "awaiting_shipment" : "rejected",
        rejectionReason: approved ? null : rejectionReason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId))
      .returning();

    await recordAudit({
      req,
      action: approved ? "asset.approve" : "asset.reject",
      entityType: "asset",
      entityId: assetId,
      before: asset,
      after: updated,
    });

    await notify({
      userId: asset.ownerId,
      type: approved ? "asset.approved" : "asset.rejected",
      subjectType: "asset",
      subjectId: assetId,
      titleEn: approved
        ? `Asset "${asset.title}" approved`
        : `Asset "${asset.title}" rejected`,
      titleAr: approved
        ? `تمت الموافقة على العنصر "${asset.title}"`
        : `تم رفض العنصر "${asset.title}"`,
      bodyEn: approved
        ? "Schedule the shipment to our inspection warehouse."
        : rejectionReason ?? "See the full details in your dashboard.",
      bodyAr: approved
        ? "قم بجدولة شحن العنصر إلى مستودع الفحص لدينا."
        : rejectionReason ?? "راجع التفاصيل في لوحة التحكم.",
      actionUrl: `/owner/assets/${assetId}`,
    });

    res.json(updated);
  })
);

// ── Ops: mark asset as received at warehouse ────────────────────────────────
router.post(
  "/:id/received",
  authenticate,
  requirePermission("operations.update"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const { warehouseLocationCode } = req.body as { warehouseLocationCode: string };

    const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.status !== "awaiting_shipment") {
      throw new LegalStateError(`Expected awaiting_shipment, got ${asset.status}`);
    }

    const [updated] = await db
      .update(assets)
      .set({
        status: "in_inspection",
        warehouseLocationCode,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    await db.insert(inventoryMovements).values({
      assetId: id,
      fromLocation: "owner",
      toLocation: warehouseLocationCode ?? "warehouse",
      movedByUserId: req.user!.userId,
      reason: "intake_received",
    });

    await recordAudit({
      req,
      action: "asset.received_at_warehouse",
      entityType: "asset",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

// ── Public catalog listing (anyone can browse) ──────────────────────────────
router.get(
  "/listings",
  asyncHandler(async (req, res) => {
    const filter = AssetListingFilter.parse(req.query);
    const conditions = [eq(assets.status, "listed")];

    if (filter.category) conditions.push(eq(assets.category, filter.category));
    if (filter.brand) conditions.push(eq(assets.brand, filter.brand));
    if (filter.minDaily)
      conditions.push(gte(assets.dailyRentalPriceHalalas, filter.minDaily));
    if (filter.maxDaily)
      conditions.push(lte(assets.dailyRentalPriceHalalas, filter.maxDaily));

    const rows = await db
      .select({
        id: assets.id,
        title: assets.title,
        brand: assets.brand,
        model: assets.model,
        category: assets.category,
        dailyRentalPriceHalalas: assets.dailyRentalPriceHalalas,
        evaluatedValueHalalas: assets.evaluatedValueHalalas,
        studioImagesJson: assets.studioImagesJson,
        attributesJson: assets.attributesJson,
        riskCategory: assets.riskCategory,
      })
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.updatedAt))
      .limit(filter.limit);

    res.json({ items: rows, count: rows.length });
  })
);

// ── Public item detail ─────────────────────────────────────────────────────
router.get(
  "/listings/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        id: assets.id,
        title: assets.title,
        brand: assets.brand,
        model: assets.model,
        category: assets.category,
        description: assets.description,
        dailyRentalPriceHalalas: assets.dailyRentalPriceHalalas,
        evaluatedValueHalalas: assets.evaluatedValueHalalas,
        studioImagesJson: assets.studioImagesJson,
        attributesJson: assets.attributesJson,
        riskCategory: assets.riskCategory,
        status: assets.status,
      })
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);
    if (!row) throw new NotFoundError("Asset");
    if (row.status !== "listed") throw new NotFoundError("Asset");
    res.json(row);
  })
);

// ── Admin: publish a ready asset ────────────────────────────────────────────
router.post(
  "/:id/publish",
  authenticate,
  requirePermission("asset.approve"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    if (asset.status !== "ready_for_listing") {
      throw new LegalStateError(`Expected ready_for_listing, got ${asset.status}`);
    }

    const [updated] = await db
      .update(assets)
      .set({ status: "listed", updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();

    await recordAudit({
      req,
      action: "asset.publish",
      entityType: "asset",
      entityId: id,
      after: updated,
    });

    res.json(updated);
  })
);

// ── Admin / Ops: full asset record ─────────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!asset) throw new NotFoundError("Asset");
    // Owners can only see their own assets; others need read.any.
    if (req.user!.role === "owner" && asset.ownerId !== req.user!.userId) {
      throw new ForbiddenError();
    }
    res.json(asset);
  })
);

export default router;
