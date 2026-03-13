import OpenAI from "openai";
import { readFileSync } from "fs";
import {
  extractFirstJSON,
  OperationalMetricsSchema,
  IssueDetectionSchema,
  PerformanceScoringSchema,
  RecipeComplianceSchema,
  GPTAggregatedSchema,
} from "../utils/schemas.js";
import type {
  OperationalMetrics,
  IssueDetection,
  PerformanceScoring,
  RecipeCompliance,
  GPTAggregated,
} from "../utils/schemas.js";

const GPT_MODEL = "gpt-4o";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey });
}

function frameToBase64(framePath: string): string {
  const buffer = readFileSync(framePath);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

// ── Prompt 1: Operational Metrics ────────────────────────────────────────────

async function analyzeOperationalMetrics(
  client: OpenAI,
  imageBase64: string
): Promise<OperationalMetrics> {
  const prompt = `أنت محلل جودة مطاعم. حلل هذه الصورة وأرجع JSON فقط:
{
  "hygieneScore": 0-100,
  "crowdingLevel": "low"|"medium"|"high",
  "equipmentStatus": "operational"|"degraded"|"offline",
  "staffCount": عدد الموظفين المرئيين,
  "workflowEfficiency": 0-100,
  "temperatureControl": "ok"|"warning"|"critical",
  "cleanlinessLevel": 0-100,
  "notes": "ملاحظات إضافية"
}
أرجع JSON نقي فقط.`;

  const response = await client.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 800,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return OperationalMetricsSchema.parse(extractFirstJSON(text));
}

// ── Prompt 2: Issue Detection ─────────────────────────────────────────────────

async function analyzeIssueDetection(
  client: OpenAI,
  imageBase64: string
): Promise<IssueDetection> {
  const prompt = `أنت محلل سلامة مطاعم. حلل هذه الصورة للمشكلات وأرجع JSON فقط:
{
  "issues": [{"type": "نوع المشكلة", "severity": "low"|"medium"|"high"|"critical", "description": "وصف", "location": "موقع"}],
  "alertLevel": "none"|"low"|"medium"|"high"|"critical",
  "safetyViolations": ["انتهاك 1"],
  "qualityIssues": ["مشكلة جودة 1"],
  "immediateActionRequired": true|false
}
أرجع JSON نقي فقط.`;

  const response = await client.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 800,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return IssueDetectionSchema.parse(extractFirstJSON(text));
}

// ── Prompt 3: Performance Scoring ─────────────────────────────────────────────

async function analyzePerformanceScoring(
  client: OpenAI,
  imageBase64: string
): Promise<PerformanceScoring> {
  const prompt = `أنت محلل أداء مطاعم. قيّم هذه الصورة وأرجع JSON فقط:
{
  "overallScore": 0-100,
  "qualityRating": "excellent"|"good"|"fair"|"poor"|"critical",
  "preparationTime": "fast"|"normal"|"slow",
  "portionAccuracy": 0-100,
  "presentationScore": 0-100,
  "staffPerformance": 0-100,
  "strengths": ["نقطة قوة"],
  "improvements": ["مجال تحسين"]
}
أرجع JSON نقي فقط.`;

  const response = await client.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 800,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return PerformanceScoringSchema.parse(extractFirstJSON(text));
}

// ── Prompt 4: Recipe Compliance ───────────────────────────────────────────────

async function analyzeRecipeCompliance(
  client: OpenAI,
  imageBase64: string,
  recipeSpec: Record<string, unknown>
): Promise<RecipeCompliance> {
  const prompt = `أنت محلل امتثال وصفات. قارن هذه الصورة مع المواصفات التالية وأرجع JSON فقط:

مواصفات الوصفة:
${JSON.stringify(recipeSpec, null, 2)}

أرجع JSON بهذا الهيكل:
{
  "ingredientPresenceScore": 0-100,
  "assemblyOrderScore": 0-100,
  "portionScore": 0-100,
  "presentationScore": 0-100,
  "safetyScore": 0-100,
  "totalScore": 0-100,
  "complianceStatus": "compliant"|"partial"|"non_compliant",
  "detectedIngredients": ["مكون موجود"],
  "missingIngredients": ["مكون مفقود"],
  "safetyViolations": ["انتهاك سلامة"],
  "reasons": ["سبب التقييم"]
}
أرجع JSON نقي فقط.`;

  const response = await client.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return RecipeComplianceSchema.parse(extractFirstJSON(text));
}

// ── Main: Analyze all frames with all 4 prompts ───────────────────────────────

export interface FrameAnalysisResult {
  frameId: number;
  timestampSec: number;
  frameIndex: number;
  operational?: OperationalMetrics;
  issues?: IssueDetection;
  performance?: PerformanceScoring;
  compliance?: RecipeCompliance;
  error?: string;
}

export async function analyzeFrameWithGPT(
  framePath: string,
  frameId: number,
  frameIndex: number,
  timestampSec: number,
  recipeSpec?: Record<string, unknown>
): Promise<FrameAnalysisResult> {
  const client = getClient();
  const imageBase64 = frameToBase64(framePath);

  const results = await Promise.allSettled([
    analyzeOperationalMetrics(client, imageBase64),
    analyzeIssueDetection(client, imageBase64),
    analyzePerformanceScoring(client, imageBase64),
    recipeSpec ? analyzeRecipeCompliance(client, imageBase64, recipeSpec) : Promise.resolve(undefined),
  ]);

  return {
    frameId,
    timestampSec,
    frameIndex,
    operational: results[0].status === "fulfilled" ? results[0].value : undefined,
    issues: results[1].status === "fulfilled" ? results[1].value : undefined,
    performance: results[2].status === "fulfilled" ? results[2].value : undefined,
    compliance: results[3].status === "fulfilled" ? results[3].value : undefined,
    error:
      results.filter((r) => r.status === "rejected").length > 0
        ? results
            .filter((r): r is PromiseRejectedResult => r.status === "rejected")
            .map((r) => r.reason?.message)
            .join("; ")
        : undefined,
  };
}

// ── Aggregate multiple frame results ─────────────────────────────────────────

export function aggregateFrameResults(frames: FrameAnalysisResult[]): GPTAggregated {
  const validFrames = frames.filter((f) => !f.error || f.operational);

  const avgScore =
    validFrames.reduce((sum, f) => sum + (f.performance?.overallScore ?? 50), 0) /
    Math.max(validFrames.length, 1);

  const alertLevels = ["none", "low", "medium", "high", "critical"] as const;
  type AlertLevel = (typeof alertLevels)[number];

  const maxAlertLevel = frames.reduce<AlertLevel>((max, f) => {
    const current = f.issues?.alertLevel ?? "none";
    return alertLevels.indexOf(current as AlertLevel) > alertLevels.indexOf(max)
      ? (current as AlertLevel)
      : max;
  }, "none");

  // Aggregate operational metrics
  const opMetrics = validFrames.filter((f) => f.operational).map((f) => f.operational!);
  const avgOp =
    opMetrics.length > 0
      ? {
          hygieneScore: opMetrics.reduce((s, m) => s + m.hygieneScore, 0) / opMetrics.length,
          crowdingLevel: opMetrics[Math.floor(opMetrics.length / 2)].crowdingLevel,
          equipmentStatus: opMetrics[0].equipmentStatus,
          staffCount: Math.round(opMetrics.reduce((s, m) => s + m.staffCount, 0) / opMetrics.length),
          workflowEfficiency: opMetrics.reduce((s, m) => s + m.workflowEfficiency, 0) / opMetrics.length,
          temperatureControl: opMetrics[0].temperatureControl,
          cleanlinessLevel: opMetrics.reduce((s, m) => s + m.cleanlinessLevel, 0) / opMetrics.length,
          notes: "",
        }
      : undefined;

  // Aggregate issues
  const allIssues = frames.flatMap((f) => f.issues?.issues ?? []);
  const allViolations = [...new Set(frames.flatMap((f) => f.issues?.safetyViolations ?? []))];
  const allQualityIssues = [...new Set(frames.flatMap((f) => f.issues?.qualityIssues ?? []))];

  // Aggregate performance
  const perfMetrics = validFrames.filter((f) => f.performance).map((f) => f.performance!);
  const avgPerf =
    perfMetrics.length > 0
      ? {
          overallScore: avgScore,
          qualityRating: perfMetrics[Math.floor(perfMetrics.length / 2)].qualityRating,
          preparationTime: perfMetrics[0].preparationTime,
          portionAccuracy: perfMetrics.reduce((s, m) => s + m.portionAccuracy, 0) / perfMetrics.length,
          presentationScore: perfMetrics.reduce((s, m) => s + m.presentationScore, 0) / perfMetrics.length,
          staffPerformance: perfMetrics.reduce((s, m) => s + m.staffPerformance, 0) / perfMetrics.length,
          strengths: [...new Set(perfMetrics.flatMap((m) => m.strengths))].slice(0, 5),
          improvements: [...new Set(perfMetrics.flatMap((m) => m.improvements))].slice(0, 5),
        }
      : undefined;

  // Aggregate compliance
  const compMetrics = validFrames.filter((f) => f.compliance).map((f) => f.compliance!);
  const avgComp =
    compMetrics.length > 0
      ? {
          ingredientPresenceScore: compMetrics.reduce((s, m) => s + m.ingredientPresenceScore, 0) / compMetrics.length,
          assemblyOrderScore: compMetrics.reduce((s, m) => s + m.assemblyOrderScore, 0) / compMetrics.length,
          portionScore: compMetrics.reduce((s, m) => s + m.portionScore, 0) / compMetrics.length,
          presentationScore: compMetrics.reduce((s, m) => s + m.presentationScore, 0) / compMetrics.length,
          safetyScore: compMetrics.reduce((s, m) => s + m.safetyScore, 0) / compMetrics.length,
          totalScore: compMetrics.reduce((s, m) => s + m.totalScore, 0) / compMetrics.length,
          complianceStatus: compMetrics[Math.floor(compMetrics.length / 2)].complianceStatus,
          detectedIngredients: [...new Set(compMetrics.flatMap((m) => m.detectedIngredients))],
          missingIngredients: [...new Set(compMetrics.flatMap((m) => m.missingIngredients))],
          safetyViolations: [...new Set(compMetrics.flatMap((m) => m.safetyViolations))],
          reasons: [...new Set(compMetrics.flatMap((m) => m.reasons))].slice(0, 10),
        }
      : undefined;

  // Build timeline from frame results
  const timeline = frames
    .filter((f) => f.issues?.alertLevel && f.issues.alertLevel !== "none")
    .map((f) => ({
      timestampSec: f.timestampSec,
      frameIndex: f.frameIndex,
      event: f.issues?.issues[0]?.type ?? "issue_detected",
      severity: f.issues?.alertLevel ?? "low",
    }));

  const keyFindings = [
    ...new Set([
      ...(avgPerf?.strengths ?? []),
      ...(allViolations.length > 0 ? [`${allViolations.length} انتهاك سلامة مكتشف`] : []),
      ...(allQualityIssues.length > 0 ? [`${allQualityIssues.length} مشكلة جودة`] : []),
    ]),
  ].slice(0, 8);

  return GPTAggregatedSchema.parse({
    framesAnalyzed: frames.length,
    averageQualityScore: Math.round(avgScore),
    alertLevel: maxAlertLevel,
    operationalMetrics: avgOp,
    issueDetection: {
      issues: allIssues.slice(0, 20),
      alertLevel: maxAlertLevel,
      safetyViolations: allViolations,
      qualityIssues: allQualityIssues,
      immediateActionRequired: frames.some((f) => f.issues?.immediateActionRequired),
    },
    performanceScoring: avgPerf,
    recipeCompliance: avgComp,
    timeline,
    keyFindings,
    recommendations: avgPerf?.improvements ?? [],
  });
}
