import { Router } from "express";
import { db } from "../db/index.js";
import { stores, storeCameras } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const allStores = await db.select().from(stores).orderBy(stores.id);
    return res.json(allStores);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stores" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, parseInt(req.params.id)))
      .limit(1);

    if (!store) return res.status(404).json({ error: "Store not found" });

    const cameras = await db
      .select()
      .from(storeCameras)
      .where(eq(storeCameras.storeId, store.id));

    return res.json({ ...store, cameras });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch store" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, city, cameras: cameraCount } = req.body;
    const [store] = await db
      .insert(stores)
      .values({ name, type: type ?? "restaurant", city, cameras: cameraCount ?? 1 })
      .returning();
    return res.status(201).json(store);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create store" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, type, city, cameras: cameraCount } = req.body;
    const [store] = await db
      .update(stores)
      .set({ name, type, city, cameras: cameraCount })
      .where(eq(stores.id, parseInt(req.params.id)))
      .returning();
    if (!store) return res.status(404).json({ error: "Store not found" });
    return res.json(store);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update store" });
  }
});

export default router;
