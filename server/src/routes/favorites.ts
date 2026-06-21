import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { favorites, assets } from "../db/schema.js";
import { authenticate, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const rows = await db
      .select({
        id: favorites.id,
        assetId: favorites.assetId,
        createdAt: favorites.createdAt,
        asset: {
          id: assets.id,
          title: assets.title,
          brand: assets.brand,
          model: assets.model,
          category: assets.category,
          dailyRentalPriceHalalas: assets.dailyRentalPriceHalalas,
          evaluatedValueHalalas: assets.evaluatedValueHalalas,
          status: assets.status,
          studioImagesJson: assets.studioImagesJson,
          submissionImagesJson: assets.submissionImagesJson,
        },
      })
      .from(favorites)
      .innerJoin(assets, eq(favorites.assetId, assets.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    res.json(rows);
  })
);

router.post(
  "/:assetId",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const assetId = Number(req.params.assetId);

    const existing = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.assetId, assetId)))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ favorited: true, id: existing[0].id });
    }

    const [fav] = await db
      .insert(favorites)
      .values({ userId, assetId })
      .returning();
    res.status(201).json({ favorited: true, id: fav.id });
  })
);

router.delete(
  "/:assetId",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const assetId = Number(req.params.assetId);

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.assetId, assetId)));
    res.json({ favorited: false });
  })
);

router.get(
  "/check/:assetId",
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.userId;
    const assetId = Number(req.params.assetId);

    const existing = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.assetId, assetId)))
      .limit(1);
    res.json({ favorited: existing.length > 0 });
  })
);

export default router;
