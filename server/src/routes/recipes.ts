import { Router } from "express";
import { db } from "../db/index.js";
import { recipes, recipeSpecs } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/recipes
router.get("/", async (req, res) => {
  try {
    const allRecipes = await db
      .select({
        id: recipes.id,
        storeId: recipes.storeId,
        name: recipes.name,
        version: recipes.version,
        isActive: recipes.isActive,
        createdAt: recipes.createdAt,
        specId: recipeSpecs.id,
        specJson: recipeSpecs.specJson,
      })
      .from(recipes)
      .leftJoin(recipeSpecs, eq(recipeSpecs.recipeId, recipes.id))
      .orderBy(desc(recipes.createdAt));

    // Group by recipe (take latest spec)
    const recipeMap = new Map<number, typeof allRecipes[0]>();
    for (const row of allRecipes) {
      if (!recipeMap.has(row.id)) {
        recipeMap.set(row.id, row);
      }
    }

    return res.json([...recipeMap.values()]);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// GET /api/recipes/:id
router.get("/:id", async (req, res) => {
  try {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, parseInt(req.params.id)))
      .limit(1);

    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const [spec] = await db
      .select()
      .from(recipeSpecs)
      .where(eq(recipeSpecs.recipeId, recipe.id))
      .limit(1);

    return res.json({ ...recipe, spec });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

// POST /api/recipes
router.post("/", async (req, res) => {
  try {
    const { storeId, name, version, specJson } = req.body;

    const [recipe] = await db
      .insert(recipes)
      .values({
        storeId: storeId ?? null,
        name,
        version: version ?? "1.0",
        isActive: true,
      })
      .returning();

    let spec = null;
    if (specJson) {
      [spec] = await db
        .insert(recipeSpecs)
        .values({ recipeId: recipe.id, specJson })
        .returning();
    }

    return res.status(201).json({ ...recipe, spec });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create recipe" });
  }
});

// PUT /api/recipes/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, version, isActive, specJson, storeId } = req.body;
    const id = parseInt(req.params.id);

    const [recipe] = await db
      .update(recipes)
      .set({ name, version, isActive, storeId: storeId ?? null })
      .where(eq(recipes.id, id))
      .returning();

    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    let spec = null;
    if (specJson !== undefined) {
      // Delete old spec and insert new one
      await db.delete(recipeSpecs).where(eq(recipeSpecs.recipeId, id));
      [spec] = await db
        .insert(recipeSpecs)
        .values({ recipeId: id, specJson })
        .returning();
    }

    return res.json({ ...recipe, spec });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update recipe" });
  }
});

// DELETE /api/recipes/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(recipeSpecs).where(eq(recipeSpecs.recipeId, id));
    await db.delete(recipes).where(eq(recipes.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete recipe" });
  }
});

export default router;
