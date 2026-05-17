import { Router } from "express";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { ratings, rentals, assets } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { RatingCreateSchema } from "../utils/schemas.js";
import { NotFoundError, LegalStateError, ConflictError } from "../utils/errors.js";

const router = Router();

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = RatingCreateSchema.parse(req.body);
    const userId = req.user!.userId;

    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) throw new NotFoundError("Rental");

    const isRenter = rental.renterId === userId;
    const isOwner = rental.ownerId === userId;
    if (!isRenter && !isOwner) {
      throw new LegalStateError("Only participants can rate a rental");
    }

    if (!["closed", "closed_with_penalty"].includes(rental.status)) {
      throw new LegalStateError("Can only rate closed rentals");
    }

    const existing = await db
      .select({ id: ratings.id })
      .from(ratings)
      .where(
        and(
          eq(ratings.rentalId, input.rentalId),
          eq(ratings.reviewerUserId, userId)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictError("Already rated this rental");
    }

    const [rating] = await db
      .insert(ratings)
      .values({
        rentalId: rental.id,
        assetId: rental.assetId,
        reviewerUserId: userId,
        reviewerRole: isRenter ? "renter" : "owner",
        overallScore: input.overallScore,
        conditionScore: input.conditionScore,
        serviceScore: input.serviceScore,
        comment: input.comment,
      })
      .returning();

    res.status(201).json(rating);
  })
);

router.get(
  "/asset/:assetId",
  asyncHandler(async (req, res) => {
    const assetId = Number(req.params.assetId);
    const rows = await db
      .select()
      .from(ratings)
      .where(eq(ratings.assetId, assetId))
      .orderBy(desc(ratings.createdAt))
      .limit(50);

    const [stats] = await db
      .select({
        avgOverall: avg(ratings.overallScore),
        avgCondition: avg(ratings.conditionScore),
        avgService: avg(ratings.serviceScore),
        total: count(),
      })
      .from(ratings)
      .where(eq(ratings.assetId, assetId));

    res.json({
      ratings: rows,
      stats: {
        avgOverall: stats?.avgOverall ? Number(stats.avgOverall) : null,
        avgCondition: stats?.avgCondition ? Number(stats.avgCondition) : null,
        avgService: stats?.avgService ? Number(stats.avgService) : null,
        total: Number(stats?.total ?? 0),
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
      .from(ratings)
      .where(eq(ratings.reviewerUserId, req.user!.userId))
      .orderBy(desc(ratings.createdAt));
    res.json(rows);
  })
);

export default router;
