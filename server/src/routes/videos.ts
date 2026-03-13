import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import {
  videoUploads,
  videoFrames,
  aiVideoAnalysisGemini,
  aiFrameAnalysisGpt,
  recipeComplianceResults,
  stores,
  recipes,
} from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { enqueueAnalysis } from "../queues/analysisQueue.js";
import { UPLOADS_DIR, ensureDirectories } from "../services/videoService.js";

await ensureDirectories();

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "video/mp4" || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files allowed"));
    }
  },
});

const router = Router();

// GET /api/videos
router.get("/", async (req, res) => {
  try {
    const { storeId, limit = "20", offset = "0" } = req.query;

    const query = db
      .select({
        id: videoUploads.id,
        storeId: videoUploads.storeId,
        recipeId: videoUploads.recipeId,
        filename: videoUploads.filename,
        originalName: videoUploads.originalName,
        durationSec: videoUploads.durationSec,
        status: videoUploads.status,
        errorMessage: videoUploads.errorMessage,
        createdAt: videoUploads.createdAt,
        storeName: stores.name,
        recipeName: recipes.name,
      })
      .from(videoUploads)
      .leftJoin(stores, eq(stores.id, videoUploads.storeId))
      .leftJoin(recipes, eq(recipes.id, videoUploads.recipeId))
      .orderBy(desc(videoUploads.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const videos = storeId
      ? await query.where(eq(videoUploads.storeId, parseInt(storeId as string)))
      : await query;

    return res.json(videos);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// POST /api/videos/upload
router.post("/upload", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const { storeId, recipeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ error: "storeId is required" });
    }

    const [video] = await db
      .insert(videoUploads)
      .values({
        storeId: parseInt(storeId),
        recipeId: recipeId ? parseInt(recipeId) : null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        status: "uploaded",
      })
      .returning();

    return res.status(201).json(video);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/videos/:id/start-analysis
router.post("/:id/start-analysis", async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);

    const [video] = await db
      .select()
      .from(videoUploads)
      .where(eq(videoUploads.id, videoId))
      .limit(1);

    if (!video) return res.status(404).json({ error: "Video not found" });

    if (video.status === "analyzing_gpt" || video.status === "analyzing_gemini" || video.status === "extracting_frames") {
      return res.status(409).json({ error: "Analysis already running" });
    }

    // Reset status
    await db.update(videoUploads).set({ status: "uploaded", errorMessage: null }).where(eq(videoUploads.id, videoId));

    // Enqueue
    const job = await enqueueAnalysis(videoId);

    return res.json({ jobId: job.id, videoId, status: "queued" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to start analysis" });
  }
});

// GET /api/videos/:id/status
router.get("/:id/status", async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const [video] = await db
      .select()
      .from(videoUploads)
      .where(eq(videoUploads.id, videoId))
      .limit(1);

    if (!video) return res.status(404).json({ error: "Video not found" });

    const frameCount = await db
      .select()
      .from(videoFrames)
      .where(eq(videoFrames.videoId, videoId));

    return res.json({
      id: video.id,
      status: video.status,
      errorMessage: video.errorMessage,
      durationSec: video.durationSec,
      framesExtracted: frameCount.length,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get status" });
  }
});

// GET /api/videos/:id/results
router.get("/:id/results", async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);

    const [video] = await db
      .select({
        id: videoUploads.id,
        storeId: videoUploads.storeId,
        recipeId: videoUploads.recipeId,
        filename: videoUploads.filename,
        originalName: videoUploads.originalName,
        durationSec: videoUploads.durationSec,
        status: videoUploads.status,
        errorMessage: videoUploads.errorMessage,
        createdAt: videoUploads.createdAt,
        storeName: stores.name,
        recipeName: recipes.name,
      })
      .from(videoUploads)
      .leftJoin(stores, eq(stores.id, videoUploads.storeId))
      .leftJoin(recipes, eq(recipes.id, videoUploads.recipeId))
      .where(eq(videoUploads.id, videoId))
      .limit(1);

    if (!video) return res.status(404).json({ error: "Video not found" });

    const frames = await db
      .select()
      .from(videoFrames)
      .where(eq(videoFrames.videoId, videoId))
      .orderBy(videoFrames.frameIndex);

    const [geminiAnalysis] = await db
      .select()
      .from(aiVideoAnalysisGemini)
      .where(eq(aiVideoAnalysisGemini.videoId, videoId))
      .orderBy(desc(aiVideoAnalysisGemini.createdAt))
      .limit(1);

    const gptFrameAnalyses = await db
      .select()
      .from(aiFrameAnalysisGpt)
      .where(eq(aiFrameAnalysisGpt.videoId, videoId))
      .orderBy(aiFrameAnalysisGpt.frameId);

    const complianceResults = await db
      .select()
      .from(recipeComplianceResults)
      .where(eq(recipeComplianceResults.videoId, videoId));

    // Compute agreement percentage between providers
    let agreementPct: number | null = null;
    if (geminiAnalysis?.normalizedJson && gptFrameAnalyses.length > 0) {
      const geminiNorm = geminiAnalysis.normalizedJson as Record<string, unknown>;
      // Simple agreement: compare overall quality scores
      const geminiScore = (geminiNorm?.overallQualityScore as number) ?? 50;
      // Find aggregated GPT score from compliance results or frame analyses
      const gptCompliance = complianceResults.find((r) => r.provider === "gpt_frames");
      const geminiCompliance = complianceResults.find((r) => r.provider === "gemini");

      if (gptCompliance && geminiCompliance) {
        const diff = Math.abs(gptCompliance.scoreTotal - geminiCompliance.scoreTotal);
        agreementPct = Math.max(0, 100 - diff);
      } else {
        agreementPct = null;
      }
    }

    return res.json({
      video,
      frames: frames.length,
      gemini: geminiAnalysis
        ? {
            id: geminiAnalysis.id,
            model: geminiAnalysis.model,
            normalizedJson: geminiAnalysis.normalizedJson,
            summaryText: geminiAnalysis.summaryText,
            status: geminiAnalysis.status,
            error: geminiAnalysis.error,
          }
        : null,
      gpt: {
        framesAnalyzed: gptFrameAnalyses.length,
        analyses: gptFrameAnalyses.map((a) => ({
          id: a.id,
          frameId: a.frameId,
          normalizedJson: a.normalizedJson,
          status: a.status,
          error: a.error,
        })),
      },
      compliance: complianceResults,
      agreementPct,
      missingProviders: {
        gemini: !process.env.GEMINI_API_KEY,
        openai: !process.env.OPENAI_API_KEY,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch results" });
  }
});

export default router;
