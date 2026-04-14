import { Router } from "express";
import { db } from "../db/index.js";
import {
  stores,
  storeAlerts,
  videoUploads,
  recipeComplianceResults,
} from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

const router = Router();

// Default coordinates for Saudi cities (fallback when lat/long not set)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "الرياض": { lat: 24.7136, lng: 46.6753 },
  "جدة": { lat: 21.4858, lng: 39.1925 },
  "الدمام": { lat: 26.4207, lng: 50.0888 },
  "مكة": { lat: 21.3891, lng: 39.8579 },
  "المدينة": { lat: 24.5247, lng: 39.5692 },
  "الخبر": { lat: 26.2172, lng: 50.1971 },
  "الطائف": { lat: 21.2703, lng: 40.4158 },
  "تبوك": { lat: 28.3998, lng: 36.5700 },
  "أبها": { lat: 18.2164, lng: 42.5053 },
  "بريدة": { lat: 26.3260, lng: 43.9750 },
};

// GET /api/heatmap → geo + quality info per store
router.get("/", async (req, res) => {
  try {
    const allStores = await db.select().from(stores);

    const videoCounts = await db
      .select({
        storeId: videoUploads.storeId,
        count: sql<number>`count(*)::int`,
      })
      .from(videoUploads)
      .groupBy(videoUploads.storeId);

    const alertCounts = await db
      .select({
        storeId: storeAlerts.storeId,
        count: sql<number>`count(*)::int`,
        critical: sql<number>`sum(case when severity = 'critical' then 1 else 0 end)::int`,
        high: sql<number>`sum(case when severity = 'high' then 1 else 0 end)::int`,
        open: sql<number>`sum(case when status = 'open' then 1 else 0 end)::int`,
      })
      .from(storeAlerts)
      .groupBy(storeAlerts.storeId);

    const complianceByStore = await db
      .select({
        storeId: videoUploads.storeId,
        avgScore: sql<number>`avg(score_total)::numeric(5,2)`,
        samples: sql<number>`count(*)::int`,
      })
      .from(recipeComplianceResults)
      .leftJoin(videoUploads, eq(videoUploads.id, recipeComplianceResults.videoId))
      .groupBy(videoUploads.storeId);

    const videoMap = new Map(videoCounts.map((v) => [v.storeId, v.count]));
    const alertMap = new Map(alertCounts.map((a) => [a.storeId, a]));
    const complianceMap = new Map(
      complianceByStore.map((c) => [c.storeId, { avgScore: Number(c.avgScore), samples: c.samples }])
    );

    const points = allStores.map((s) => {
      const fallback = CITY_COORDS[s.city] ?? { lat: 24.7136, lng: 46.6753 };
      const lat = s.latitude ?? fallback.lat;
      const lng = s.longitude ?? fallback.lng;
      const alerts = alertMap.get(s.id);
      const compliance = complianceMap.get(s.id);

      const score = compliance?.avgScore ?? null;
      // Risk: blend open alerts + critical + low compliance
      const openAlerts = alerts?.open ?? 0;
      const criticalAlerts = alerts?.critical ?? 0;
      const risk =
        criticalAlerts >= 2 || (score !== null && score < 50)
          ? "critical"
          : criticalAlerts >= 1 || openAlerts >= 5 || (score !== null && score < 70)
            ? "high"
            : openAlerts >= 2 || (score !== null && score < 85)
              ? "medium"
              : "low";

      return {
        storeId: s.id,
        name: s.name,
        type: s.type,
        city: s.city,
        address: s.address,
        latitude: lat,
        longitude: lng,
        hasExactCoords: s.latitude !== null && s.longitude !== null,
        cameras: s.cameras,
        videoCount: videoMap.get(s.id) ?? 0,
        alerts: {
          total: alerts?.count ?? 0,
          open: alerts?.open ?? 0,
          high: alerts?.high ?? 0,
          critical: alerts?.critical ?? 0,
        },
        compliance: {
          avgScore: score !== null ? Math.round(score * 10) / 10 : null,
          samples: compliance?.samples ?? 0,
        },
        risk,
      };
    });

    // Aggregate by city
    const cityAgg = new Map<
      string,
      {
        city: string;
        stores: number;
        videos: number;
        openAlerts: number;
        criticalAlerts: number;
        totalScore: number;
        scoreSamples: number;
      }
    >();
    for (const p of points) {
      const prev =
        cityAgg.get(p.city) ?? {
          city: p.city,
          stores: 0,
          videos: 0,
          openAlerts: 0,
          criticalAlerts: 0,
          totalScore: 0,
          scoreSamples: 0,
        };
      prev.stores += 1;
      prev.videos += p.videoCount;
      prev.openAlerts += p.alerts.open;
      prev.criticalAlerts += p.alerts.critical;
      if (p.compliance.avgScore !== null) {
        prev.totalScore += p.compliance.avgScore * p.compliance.samples;
        prev.scoreSamples += p.compliance.samples;
      }
      cityAgg.set(p.city, prev);
    }

    const cities = Array.from(cityAgg.values()).map((c) => ({
      city: c.city,
      stores: c.stores,
      videos: c.videos,
      openAlerts: c.openAlerts,
      criticalAlerts: c.criticalAlerts,
      avgScore:
        c.scoreSamples > 0 ? Math.round((c.totalScore / c.scoreSamples) * 10) / 10 : null,
      ...CITY_COORDS[c.city],
    }));

    return res.json({
      points,
      cities,
      summary: {
        totalStores: points.length,
        criticalStores: points.filter((p) => p.risk === "critical").length,
        highRiskStores: points.filter((p) => p.risk === "high").length,
        citiesCovered: cities.length,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to build heatmap" });
  }
});

export default router;
