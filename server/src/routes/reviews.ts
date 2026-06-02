import { Router } from "express";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { reviews, rentals, assets, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { ReviewCreateSchema } from "../utils/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ForbiddenError, LegalStateError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { notifyReviewReceived } from "../services/notificationService.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requirePermission("review.create"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = ReviewCreateSchema.parse(req.body);
    const userId = req.user!.userId;

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.renterId !== userId) throw new ForbiddenError("Not your rental");
    if (!["closed", "closed_with_penalty"].includes(rental.status)) {
      throw new LegalStateError("You can only review after a rental is closed");
    }

    const existing = await db
      .select()
      .from(reviews)
      .where(eq(reviews.rentalId, input.rentalId))
      .limit(1);
    if (existing.length > 0) {
      throw new LegalStateError("You already reviewed this rental");
    }

    const [review] = await db
      .insert(reviews)
      .values({
        rentalId: input.rentalId,
        assetId: rental.assetId,
        reviewerId: userId,
        rating: input.rating,
        title: input.title ?? null,
        comment: input.comment ?? null,
      })
      .returning();

    const [asset] = await db
      .select({ title: assets.title, ownerId: assets.ownerId })
      .from(assets)
      .where(eq(assets.id, rental.assetId))
      .limit(1);

    if (asset) {
      await notifyReviewReceived(asset.ownerId, asset.title, input.rating);
    }

    await recordAudit({
      req,
      action: "review.create",
      entityType: "review",
      entityId: review.id,
      after: { rating: review.rating, rentalId: review.rentalId },
    });

    res.status(201).json(review);
  })
);

router.get(
  "/asset/:assetId",
  asyncHandler(async (req, res) => {
    const assetId = Number(req.params.assetId);

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: users.fullName,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.assetId, assetId))
      .orderBy(desc(reviews.createdAt));

    const stats = await db
      .select({
        avgRating: avg(reviews.rating),
        totalReviews: count(),
      })
      .from(reviews)
      .where(eq(reviews.assetId, assetId));

    res.json({
      reviews: rows,
      stats: {
        averageRating: stats[0]?.avgRating ? Number(stats[0].avgRating) : null,
        totalReviews: Number(stats[0]?.totalReviews ?? 0),
      },
    });
  })
);

router.get(
  "/mine",
  authenticate,
  requirePermission("review.create"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        assetId: reviews.assetId,
        rentalId: reviews.rentalId,
        assetTitle: assets.title,
        assetBrand: assets.brand,
      })
      .from(reviews)
      .leftJoin(assets, eq(reviews.assetId, assets.id))
      .where(eq(reviews.reviewerId, req.user!.userId))
      .orderBy(desc(reviews.createdAt));
    res.json(rows);
  })
);

export default router;
