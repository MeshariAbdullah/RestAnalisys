import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentalExtensions, rentals, assets } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  RentalExtensionRequestSchema,
  RentalExtensionReviewSchema,
} from "../utils/schemas.js";
import { NotFoundError, LegalStateError, ForbiddenError } from "../utils/errors.js";
import { computeRentalQuote } from "../utils/money.js";
import { notify } from "../services/notificationService.js";
import { recordAudit } from "../services/auditService.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requirePermission("rental.create"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = RentalExtensionRequestSchema.parse(req.body);
    const userId = req.user!.userId;

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.renterId !== userId) throw new ForbiddenError();
    if (rental.status !== "active") {
      throw new LegalStateError("Can only extend active rentals");
    }

    const existing = await db
      .select({ id: rentalExtensions.id })
      .from(rentalExtensions)
      .where(
        and(
          eq(rentalExtensions.rentalId, input.rentalId),
          eq(rentalExtensions.status, "pending")
        )
      )
      .limit(1);
    if (existing.length > 0) {
      throw new LegalStateError("A pending extension request already exists");
    }

    const endDate = new Date(rental.endDate + "T00:00:00Z");
    endDate.setDate(endDate.getDate() + input.requestedDays);
    const newEndDate = endDate.toISOString().split("T")[0];

    const quote = computeRentalQuote({
      dailyPriceHalalas: rental.dailyPriceHalalas,
      durationDays: input.requestedDays,
    });

    const [extension] = await db
      .insert(rentalExtensions)
      .values({
        rentalId: rental.id,
        renterId: userId,
        requestedDays: input.requestedDays,
        newEndDate,
        additionalCostHalalas: quote.totalPayableHalalas,
        reason: input.reason,
        status: "pending",
      })
      .returning();

    await notify({
      userId: rental.ownerId,
      type: "extension_requested",
      title: "Extension Requested",
      body: `Renter requested ${input.requestedDays} extra days for rental ${rental.reference}.`,
      relatedEntityType: "rental",
      relatedEntityId: rental.id,
    });

    await recordAudit({
      req,
      action: "rental.extension_request",
      entityType: "rental_extension",
      entityId: extension.id,
      after: extension,
    });

    res.status(201).json(extension);
  })
);

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(rentalExtensions)
      .where(eq(rentalExtensions.renterId, req.user!.userId))
      .orderBy(desc(rentalExtensions.createdAt));
    res.json(rows);
  })
);

router.get(
  "/pending",
  authenticate,
  requirePermission("rental.fulfill"),
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(rentalExtensions)
      .where(eq(rentalExtensions.status, "pending"))
      .orderBy(desc(rentalExtensions.createdAt));
    res.json(rows);
  })
);

router.post(
  "/review",
  authenticate,
  requirePermission("rental.fulfill"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = RentalExtensionReviewSchema.parse(req.body);

    const [ext] = await db
      .select()
      .from(rentalExtensions)
      .where(eq(rentalExtensions.id, input.extensionId))
      .limit(1);
    if (!ext) throw new NotFoundError("Extension request");
    if (ext.status !== "pending") {
      throw new LegalStateError(`Extension already ${ext.status}`);
    }

    if (input.approved) {
      const [updated] = await db
        .update(rentalExtensions)
        .set({
          status: "approved",
          reviewedByUserId: req.user!.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(rentalExtensions.id, ext.id))
        .returning();

      await db
        .update(rentals)
        .set({
          endDate: ext.newEndDate,
          durationDays: ext.requestedDays,
          updatedAt: new Date(),
        })
        .where(eq(rentals.id, ext.rentalId));

      await notify({
        userId: ext.renterId,
        type: "extension_approved",
        title: "Extension Approved",
        body: `Your extension request for ${ext.requestedDays} days has been approved.`,
        relatedEntityType: "rental",
        relatedEntityId: ext.rentalId,
      });

      await recordAudit({
        req,
        action: "rental.extension_approve",
        entityType: "rental_extension",
        entityId: ext.id,
        after: updated,
      });

      res.json(updated);
    } else {
      const [updated] = await db
        .update(rentalExtensions)
        .set({
          status: "rejected",
          rejectionReason: input.rejectionReason,
          reviewedByUserId: req.user!.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(rentalExtensions.id, ext.id))
        .returning();

      await notify({
        userId: ext.renterId,
        type: "extension_rejected",
        title: "Extension Rejected",
        body: `Your extension request was rejected${input.rejectionReason ? `: ${input.rejectionReason}` : "."}.`,
        relatedEntityType: "rental",
        relatedEntityId: ext.rentalId,
      });

      await recordAudit({
        req,
        action: "rental.extension_reject",
        entityType: "rental_extension",
        entityId: ext.id,
        after: updated,
      });

      res.json(updated);
    }
  })
);

export default router;
