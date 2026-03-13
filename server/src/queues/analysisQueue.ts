import { db } from "../db/index.js";
import {
  videoUploads,
  videoFrames,
  aiVideoAnalysisGemini,
  aiFrameAnalysisGpt,
  recipeComplianceResults,
  storeAlerts,
  recipeSpecs,
  recipes,
} from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import {
  extractPass1Frames,
  extractPass2Frames,
  getVideoDuration,
  UPLOADS_DIR,
} from "../services/videoService.js";
import { analyzeVideoWithGemini } from "../services/geminiService.js";
import {
  analyzeFrameWithGPT,
  aggregateFrameResults,
} from "../services/openaiService.js";
import path from "path";

// ── Simple in-process job queue with DB-backed status ───────────────────────

type JobStatus = "pending" | "running" | "done" | "error";

interface Job {
  id: string;
  videoId: number;
  status: JobStatus;
  error?: string;
}

const jobMap = new Map<string, Job>();

export function getJob(videoId: number): Job | undefined {
  return [...jobMap.values()].find((j) => j.videoId === videoId);
}

async function updateVideoStatus(
  videoId: number,
  status: (typeof videoUploads.$inferSelect)["status"],
  errorMessage?: string
) {
  await db
    .update(videoUploads)
    .set({ status, errorMessage: errorMessage ?? null })
    .where(eq(videoUploads.id, videoId));
}

// ── Main analysis processor ───────────────────────────────────────────────────

async function processAnalysis(videoId: number) {
  const [video] = await db
    .select()
    .from(videoUploads)
    .where(eq(videoUploads.id, videoId))
    .limit(1);

  if (!video) throw new Error(`Video ${videoId} not found`);

  const videoPath = path.join(UPLOADS_DIR, video.filename);

  // Get recipe spec if available
  let recipeSpec: Record<string, unknown> | undefined;
  if (video.recipeId) {
    const [spec] = await db
      .select()
      .from(recipeSpecs)
      .where(eq(recipeSpecs.recipeId, video.recipeId))
      .limit(1);
    if (spec) {
      recipeSpec = spec.specJson as Record<string, unknown>;
    }
  }

  // ── Phase 1: Extract video duration ──────────────────────────────────────
  let durationSec = 0;
  try {
    durationSec = await getVideoDuration(videoPath);
    await db.update(videoUploads).set({ durationSec }).where(eq(videoUploads.id, videoId));
  } catch {}

  // ── Phase 2: Extract Pass 1 frames ───────────────────────────────────────
  await updateVideoStatus(videoId, "extracting_frames");

  const pass1Frames = await extractPass1Frames(videoPath, videoId);

  // Save frames to DB
  const savedFrames = await db
    .insert(videoFrames)
    .values(
      pass1Frames.map((f) => ({
        videoId,
        frameIndex: f.frameIndex,
        timestampSec: f.timestampSec,
        localPathOrRef: f.filePath,
      }))
    )
    .returning();

  // ── Phase 3: Run GPT frame analysis ──────────────────────────────────────
  await updateVideoStatus(videoId, "analyzing_gpt");

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  let gptAggregated;

  if (hasOpenAI) {
    const frameResults = await Promise.allSettled(
      savedFrames.map((sf, i) =>
        analyzeFrameWithGPT(
          pass1Frames[i].filePath,
          sf.id,
          sf.frameIndex,
          sf.timestampSec,
          recipeSpec
        )
      )
    );

    const successfulResults = frameResults
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof analyzeFrameWithGPT>>> => r.status === "fulfilled")
      .map((r) => r.value);

    // Save individual frame analyses
    await Promise.allSettled(
      successfulResults.map((result) =>
        db.insert(aiFrameAnalysisGpt).values({
          videoId,
          frameId: result.frameId,
          model: "gpt-4o",
          rawJson: result as unknown as Record<string, unknown>,
          normalizedJson: {
            operational: result.operational,
            issues: result.issues,
            performance: result.performance,
            compliance: result.compliance,
          },
          status: result.error ? "error" : "done",
          error: result.error ?? null,
        })
      )
    );

    gptAggregated = aggregateFrameResults(successfulResults);

    // Pass 2: Extract more frames around high-alert events
    const alertTimestamps = successfulResults
      .filter((r) => r.issues?.alertLevel && ["high", "critical"].includes(r.issues.alertLevel))
      .map((r) => r.timestampSec);

    if (alertTimestamps.length > 0) {
      const pass2Frames = await extractPass2Frames(videoPath, videoId, alertTimestamps);
      // Save pass 2 frames
      if (pass2Frames.length > 0) {
        const savedPass2 = await db
          .insert(videoFrames)
          .values(
            pass2Frames.map((f) => ({
              videoId,
              frameIndex: f.frameIndex + 1000, // offset to avoid collision
              timestampSec: f.timestampSec,
              localPathOrRef: f.filePath,
            }))
          )
          .returning();

        // Analyze pass 2 frames
        await Promise.allSettled(
          savedPass2.map((sf, i) =>
            analyzeFrameWithGPT(
              pass2Frames[i].filePath,
              sf.id,
              sf.frameIndex,
              sf.timestampSec,
              recipeSpec
            )
          )
        );
      }
    }
  }

  // ── Phase 4: Run Gemini video analysis ───────────────────────────────────
  await updateVideoStatus(videoId, "analyzing_gemini");

  const hasGemini = !!process.env.GEMINI_API_KEY;
  let geminiResult;

  if (hasGemini) {
    const geminiRaw = await analyzeVideoWithGemini(videoPath, recipeSpec);
    geminiResult = geminiRaw.normalized;

    await db.insert(aiVideoAnalysisGemini).values({
      videoId,
      model: "gemini-1.5-pro",
      rawJson: geminiRaw.raw as Record<string, unknown>,
      normalizedJson: geminiRaw.normalized as unknown as Record<string, unknown>,
      summaryText: geminiRaw.summary,
      status: "done",
    });
  }

  // ── Phase 5: Save compliance results ─────────────────────────────────────
  await updateVideoStatus(videoId, "saving_results");

  if (video.recipeId) {
    // Gemini compliance
    if (geminiResult?.recipeCompliance) {
      const gc = geminiResult.recipeCompliance;
      await db.insert(recipeComplianceResults).values({
        videoId,
        recipeId: video.recipeId,
        provider: "gemini",
        scoreTotal: gc.totalScore,
        ingredientPresenceScore: gc.ingredientPresenceScore,
        assemblyOrderScore: gc.assemblyOrderScore,
        portionScore: gc.portionScore,
        presentationScore: gc.presentationScore,
        safetyScore: gc.safetyScore,
        reasonsJson: gc.reasons,
      });
    }

    // GPT compliance
    if (gptAggregated?.recipeCompliance) {
      const gc = gptAggregated.recipeCompliance;
      await db.insert(recipeComplianceResults).values({
        videoId,
        recipeId: video.recipeId,
        provider: "gpt_frames",
        scoreTotal: gc.totalScore,
        ingredientPresenceScore: gc.ingredientPresenceScore,
        assemblyOrderScore: gc.assemblyOrderScore,
        portionScore: gc.portionScore,
        presentationScore: gc.presentationScore,
        safetyScore: gc.safetyScore,
        reasonsJson: gc.reasons,
      });
    }
  }

  // ── Phase 6: Generate alerts ──────────────────────────────────────────────
  const alertsToInsert: (typeof storeAlerts.$inferInsert)[] = [];

  // Check GPT alerts
  if (gptAggregated?.issueDetection?.immediateActionRequired) {
    alertsToInsert.push({
      storeId: video.storeId,
      videoId,
      provider: "gpt_frames",
      severity: "critical",
      type: "immediate_action",
      message: "يتطلب GPT-4o إجراءً فورياً: " + (gptAggregated.issueDetection.safetyViolations[0] ?? "انتهاك سلامة"),
      status: "open",
    });
  }

  if (gptAggregated?.alertLevel && ["high", "critical"].includes(gptAggregated.alertLevel)) {
    alertsToInsert.push({
      storeId: video.storeId,
      videoId,
      provider: "gpt_frames",
      severity: gptAggregated.alertLevel as "high" | "critical",
      type: "quality_alert",
      message: `تحليل GPT-4o: مستوى تنبيه ${gptAggregated.alertLevel} - ${gptAggregated.keyFindings[0] ?? ""}`,
      status: "open",
    });
  }

  // Check Gemini alerts
  if (geminiResult?.alertLevel && ["high", "critical"].includes(geminiResult.alertLevel)) {
    alertsToInsert.push({
      storeId: video.storeId,
      videoId,
      provider: "gemini",
      severity: geminiResult.alertLevel as "high" | "critical",
      type: "quality_alert",
      message: `تحليل Gemini: ${geminiResult.summary.slice(0, 200)}`,
      status: "open",
    });
  }

  // Compliance alerts
  if (video.recipeId) {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, video.recipeId));
    const [spec] = await db.select().from(recipeSpecs).where(eq(recipeSpecs.recipeId, video.recipeId));
    const threshold = (spec?.specJson as Record<string, unknown>)?.complianceThreshold as number ?? 75;

    if (geminiResult?.recipeCompliance && geminiResult.recipeCompliance.totalScore < threshold) {
      alertsToInsert.push({
        storeId: video.storeId,
        videoId,
        provider: "gemini",
        severity: geminiResult.recipeCompliance.totalScore < 50 ? "critical" : "high",
        type: "compliance_violation",
        message: `امتثال وصفة "${recipe?.name ?? ""}": ${geminiResult.recipeCompliance.totalScore.toFixed(0)}% (أقل من الحد ${threshold}%)`,
        status: "open",
      });
    }

    if (gptAggregated?.recipeCompliance && gptAggregated.recipeCompliance.totalScore < threshold) {
      alertsToInsert.push({
        storeId: video.storeId,
        videoId,
        provider: "gpt_frames",
        severity: gptAggregated.recipeCompliance.totalScore < 50 ? "critical" : "high",
        type: "compliance_violation",
        message: `امتثال وصفة "${recipe?.name ?? ""}": ${gptAggregated.recipeCompliance.totalScore.toFixed(0)}% (أقل من الحد ${threshold}%)`,
        status: "open",
      });
    }
  }

  if (alertsToInsert.length > 0) {
    await db.insert(storeAlerts).values(alertsToInsert);
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  await updateVideoStatus(videoId, "done");
}

// ── Queue entry point ─────────────────────────────────────────────────────────

export async function enqueueAnalysis(videoId: number) {
  const jobId = `job_${videoId}_${Date.now()}`;
  const job: Job = { id: jobId, videoId, status: "pending" };
  jobMap.set(jobId, job);

  // Start async processing (non-blocking)
  setImmediate(async () => {
    job.status = "running";
    try {
      await processAnalysis(videoId);
      job.status = "done";
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      job.status = "error";
      job.error = error;
      console.error(`Analysis job ${jobId} failed:`, err);

      await db
        .update(videoUploads)
        .set({ status: "error", errorMessage: error })
        .where(eq(videoUploads.id, videoId));
    }
  });

  return job;
}
