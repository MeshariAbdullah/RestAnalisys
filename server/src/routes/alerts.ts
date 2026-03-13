import { Router } from "express";
import { db } from "../db/index.js";
import { storeAlerts, stores, videoUploads } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/alerts
router.get("/", async (req, res) => {
  try {
    const { storeId, videoId, provider, status, limit = "50", offset = "0" } = req.query;

    const conditions = [];
    if (storeId) conditions.push(eq(storeAlerts.storeId, parseInt(storeId as string)));
    if (videoId) conditions.push(eq(storeAlerts.videoId, parseInt(videoId as string)));
    if (status) conditions.push(eq(storeAlerts.status, status as "open" | "acknowledged" | "resolved"));
    if (provider) conditions.push(eq(storeAlerts.provider, provider as string));

    const query = db
      .select({
        id: storeAlerts.id,
        storeId: storeAlerts.storeId,
        videoId: storeAlerts.videoId,
        provider: storeAlerts.provider,
        severity: storeAlerts.severity,
        type: storeAlerts.type,
        message: storeAlerts.message,
        status: storeAlerts.status,
        createdAt: storeAlerts.createdAt,
        storeName: stores.name,
      })
      .from(storeAlerts)
      .leftJoin(stores, eq(stores.id, storeAlerts.storeId))
      .orderBy(desc(storeAlerts.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const alerts =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return res.json(alerts);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// PATCH /api/alerts/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "acknowledged", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [alert] = await db
      .update(storeAlerts)
      .set({ status })
      .where(eq(storeAlerts.id, parseInt(req.params.id)))
      .returning();

    if (!alert) return res.status(404).json({ error: "Alert not found" });
    return res.json(alert);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update alert" });
  }
});

// GET /api/alerts/stats
router.get("/stats", async (req, res) => {
  try {
    const allAlerts = await db.select().from(storeAlerts);
    const stats = {
      total: allAlerts.length,
      open: allAlerts.filter((a) => a.status === "open").length,
      critical: allAlerts.filter((a) => a.severity === "critical").length,
      high: allAlerts.filter((a) => a.severity === "high").length,
      byProvider: {
        gemini: allAlerts.filter((a) => a.provider === "gemini").length,
        gpt_frames: allAlerts.filter((a) => a.provider === "gpt_frames").length,
      },
    };
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
