import { Router } from "express";
import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { reviews, rentals, users, assets } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  NotFoundError,
  ForbiddenError,
  LegalStateError,
  ConflictError,
} from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { createNotification } from "./notifications.js";

const router = Router();

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const { rentalId, rating, comment } = req.body as {
      rentalId: number;
      rating: number;
      comment?: string;
    };

    if (rating < 1 || rating > 5) {
      throw new LegalStateError("Rating must be between 1 and 5");
    }

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.renterId !== userId) throw new ForbiddenError();
    if (!["closed", "closed_with_penalty"].includes(rental.status)) {
      throw new LegalStateError("Can only review completed rentals");
    }

    const existing = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.rentalId, rentalId))
      .limit(1);
    if (existing.length > 0) throw new ConflictError("Already reviewed this rental");

    const [review] = await db
      .insert(reviews)
      .values({
        rentalId,
        assetId: rental.assetId,
        reviewerId: userId,
        rating,
        comment,
      })
      .returning();

    await createNotification({
      userId: rental.ownerId,
      type: "review_received",
      title: "New review received",
      message: `Your asset received a ${rating}-star review.`,
      linkUrl: `/owner/assets/${rental.assetId}`,
    });

    await recordAudit({
      req,
      action: "review.create",
      entityType: "review",
      entityId: review.id,
      after: review,
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
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: users.fullName,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.assetId, assetId))
      .orderBy(desc(reviews.createdAt));

    const [stats] = await db
      .select({
        averageRating: avg(reviews.rating),
        totalReviews: count(),
      })
      .from(reviews)
      .where(eq(reviews.assetId, assetId));

    res.json({
      reviews: rows,
      averageRating: stats?.averageRating ? Number(stats.averageRating) : null,
      totalReviews: Number(stats?.totalReviews ?? 0),
    });
  })
);

router.get(
  "/mine",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, userId))
      .orderBy(desc(reviews.createdAt));
    res.json(rows);
  })
);

export default router;
