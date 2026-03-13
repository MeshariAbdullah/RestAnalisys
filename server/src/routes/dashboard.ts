import { Router } from "express";
import { db } from "../db/index.js";
import {
  stores,
  videoUploads,
  storeAlerts,
  aiVideoAnalysisGemini,
  recipeComplianceResults,
  aiFrameAnalysisGpt,
} from "../db/schema.js";
import { desc, sql, eq } from "drizzle-orm";

const router = Router();

router.get("/kpis", async (req, res) => {
  try {
    const [storeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(stores);

    const [videoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(videoUploads);

    const [alertCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeAlerts)
      .where(eq(storeAlerts.status, "open"));

    const [criticalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeAlerts)
      .where(eq(storeAlerts.severity, "critical"));

    // Average compliance score
    const complianceRows = await db
      .select({ score: recipeComplianceResults.scoreTotal })
      .from(recipeComplianceResults);

    const avgCompliance =
      complianceRows.length > 0
        ? complianceRows.reduce((s, r) => s + r.score, 0) / complianceRows.length
        : null;

    // Recent analyses
    const recentVideos = await db
      .select()
      .from(videoUploads)
      .orderBy(desc(videoUploads.createdAt))
      .limit(5);

    return res.json({
      stores: storeCount.count,
      totalVideos: videoCount.count,
      openAlerts: alertCount.count,
      criticalAlerts: criticalCount.count,
      avgComplianceScore: avgCompliance ? Math.round(avgCompliance * 10) / 10 : null,
      recentVideos,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch KPIs" });
  }
});

router.get("/charts", async (req, res) => {
  try {
    // Last 7 days of videos and alerts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const videosByDay = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(videoUploads)
      .where(sql`created_at >= ${sevenDaysAgo}`)
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`);

    const alertsByDay = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::date::text`,
        count: sql<number>`count(*)::int`,
        severity: storeAlerts.severity,
      })
      .from(storeAlerts)
      .where(sql`created_at >= ${sevenDaysAgo}`)
      .groupBy(sql`date_trunc('day', created_at)`, storeAlerts.severity)
      .orderBy(sql`date_trunc('day', created_at)`);

    const complianceByProvider = await db
      .select({
        provider: recipeComplianceResults.provider,
        avgScore: sql<number>`avg(score_total)::numeric(5,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(recipeComplianceResults)
      .groupBy(recipeComplianceResults.provider);

    const storeActivity = await db
      .select({
        storeId: videoUploads.storeId,
        storeName: stores.name,
        videoCount: sql<number>`count(*)::int`,
      })
      .from(videoUploads)
      .leftJoin(stores, eq(stores.id, videoUploads.storeId))
      .groupBy(videoUploads.storeId, stores.name)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return res.json({
      videosByDay,
      alertsByDay,
      complianceByProvider,
      storeActivity,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch charts" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const { period = "weekly" } = req.query;

    let daysBack = period === "daily" ? 1 : period === "monthly" ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const videos = await db
      .select()
      .from(videoUploads)
      .where(sql`created_at >= ${since}`)
      .orderBy(desc(videoUploads.createdAt));

    const alerts = await db
      .select({
        id: storeAlerts.id,
        severity: storeAlerts.severity,
        type: storeAlerts.type,
        status: storeAlerts.status,
        provider: storeAlerts.provider,
        createdAt: storeAlerts.createdAt,
      })
      .from(storeAlerts)
      .where(sql`created_at >= ${since}`)
      .orderBy(desc(storeAlerts.createdAt));

    const compliance = await db
      .select()
      .from(recipeComplianceResults)
      .where(sql`created_at >= ${since}`);

    const avgScore =
      compliance.length > 0
        ? compliance.reduce((s, r) => s + r.scoreTotal, 0) / compliance.length
        : 0;

    return res.json({
      period,
      since: since.toISOString(),
      summary: {
        totalVideos: videos.length,
        doneVideos: videos.filter((v) => v.status === "done").length,
        errorVideos: videos.filter((v) => v.status === "error").length,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
        highAlerts: alerts.filter((a) => a.severity === "high").length,
        avgComplianceScore: Math.round(avgScore * 10) / 10,
        complianceChecks: compliance.length,
      },
      videos,
      alerts,
      compliance,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});

export default router;
