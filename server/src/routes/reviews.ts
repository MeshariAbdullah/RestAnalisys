import { Router } from "express";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { reviews, rentals, assets, users } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, LegalStateError, ConflictError, ForbiddenError } from "../utils/errors.js";
import { recordAudit } from "../services/auditService.js";
import { sendNotification } from "../services/notificationService.js";
import { z } from "zod";

const router = Router();

const ReviewCreateSchema = z.object({
  rentalId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = ReviewCreateSchema.parse(req.body);
    const reviewerId = req.user!.userId;

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");
    if (rental.renterId !== reviewerId) throw new ForbiddenError("You can only review your own rentals");
    if (!["closed", "closed_with_penalty"].includes(rental.status)) {
      throw new LegalStateError("Can only review completed rentals");
    }

    const existingReview = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.rentalId, input.rentalId))
      .limit(1);
    if (existingReview.length > 0) throw new ConflictError("Review already exists for this rental");

    const [review] = await db
      .insert(reviews)
      .values({
        rentalId: input.rentalId,
        assetId: rental.assetId,
        reviewerId,
        rating: input.rating,
        comment: input.comment,
      })
      .returning();

    const [asset] = await db.select().from(assets).where(eq(assets.id, rental.assetId)).limit(1);

    await sendNotification({
      userId: rental.ownerId,
      type: "review.received",
      vars: {
        rating: String(input.rating),
        assetTitle: asset?.title ?? "Unknown",
      },
      entityType: "review",
      entityId: review.id,
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
        rentalId: reviews.rentalId,
        rating: reviews.rating,
        comment: reviews.comment,
        reviewerName: users.fullName,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.assetId, assetId))
      .orderBy(desc(reviews.createdAt));

    const stats = await db
      .select({
        avgRating: avg(reviews.rating),
        totalReviews: count(reviews.id),
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
  asyncHandler(async (req: AuthedRequest, res) => {
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, req.user!.userId))
      .orderBy(desc(reviews.createdAt));
    res.json(rows);
  })
);

export default router;
