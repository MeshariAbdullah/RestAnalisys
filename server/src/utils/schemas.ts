import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const AlertLevelSchema = z
  .enum(["none", "low", "medium", "high", "critical"])
  .catch("low");

export const QualityRatingSchema = z
  .enum(["excellent", "good", "fair", "poor", "critical"])
  .catch("fair");

export const ComplianceStatusSchema = z
  .enum(["compliant", "partial", "non_compliant"])
  .catch("partial");

// ── Operational Metrics Schema (GPT Prompt 1) ────────────────────────────────

export const OperationalMetricsSchema = z.object({
  hygieneScore: z.number().min(0).max(100).catch(50),
  crowdingLevel: z.enum(["low", "medium", "high"]).catch("medium"),
  equipmentStatus: z.enum(["operational", "degraded", "offline"]).catch("operational"),
  staffCount: z.number().min(0).catch(0),
  workflowEfficiency: z.number().min(0).max(100).catch(50),
  temperatureControl: z.enum(["ok", "warning", "critical"]).catch("ok"),
  cleanlinessLevel: z.number().min(0).max(100).catch(50),
  notes: z.string().catch(""),
});

export type OperationalMetrics = z.infer<typeof OperationalMetricsSchema>;

// ── Issue Detection Schema (GPT Prompt 2) ────────────────────────────────────

export const IssueSchema = z.object({
  type: z.string().catch("unknown"),
  severity: AlertLevelSchema,
  description: z.string().catch(""),
  location: z.string().catch(""),
  timestamp: z.number().optional(),
});

export const IssueDetectionSchema = z.object({
  issues: z.array(IssueSchema).catch([]),
  alertLevel: AlertLevelSchema,
  safetyViolations: z.array(z.string()).catch([]),
  qualityIssues: z.array(z.string()).catch([]),
  immediateActionRequired: z.boolean().catch(false),
});

export type IssueDetection = z.infer<typeof IssueDetectionSchema>;

// ── Performance Scoring Schema (GPT Prompt 3) ─────────────────────────────────

export const PerformanceScoringSchema = z.object({
  overallScore: z.number().min(0).max(100).catch(50),
  qualityRating: QualityRatingSchema,
  preparationTime: z.enum(["fast", "normal", "slow"]).catch("normal"),
  portionAccuracy: z.number().min(0).max(100).catch(50),
  presentationScore: z.number().min(0).max(100).catch(50),
  staffPerformance: z.number().min(0).max(100).catch(50),
  strengths: z.array(z.string()).catch([]),
  improvements: z.array(z.string()).catch([]),
});

export type PerformanceScoring = z.infer<typeof PerformanceScoringSchema>;

// ── Recipe Compliance Schema (GPT Prompt 4 / Gemini) ─────────────────────────

export const RecipeComplianceSchema = z.object({
  ingredientPresenceScore: z.number().min(0).max(100).catch(0),
  assemblyOrderScore: z.number().min(0).max(100).catch(0),
  portionScore: z.number().min(0).max(100).catch(0),
  presentationScore: z.number().min(0).max(100).catch(0),
  safetyScore: z.number().min(0).max(100).catch(0),
  totalScore: z.number().min(0).max(100).catch(0),
  complianceStatus: ComplianceStatusSchema,
  detectedIngredients: z.array(z.string()).catch([]),
  missingIngredients: z.array(z.string()).catch([]),
  safetyViolations: z.array(z.string()).catch([]),
  reasons: z.array(z.string()).catch([]),
});

export type RecipeCompliance = z.infer<typeof RecipeComplianceSchema>;

// ── Gemini Full Video Analysis Schema ────────────────────────────────────────

export const GeminiVideoAnalysisSchema = z.object({
  summary: z.string().catch(""),
  overallQualityScore: z.number().min(0).max(100).catch(50),
  qualityRating: QualityRatingSchema,
  alertLevel: AlertLevelSchema,
  timeline: z
    .array(
      z.object({
        timestampSec: z.number().catch(0),
        event: z.string().catch(""),
        severity: AlertLevelSchema,
        description: z.string().catch(""),
      })
    )
    .catch([]),
  operationalMetrics: OperationalMetricsSchema.optional(),
  issueDetection: IssueDetectionSchema.optional(),
  performanceScoring: PerformanceScoringSchema.optional(),
  recipeCompliance: RecipeComplianceSchema.optional(),
  keyFindings: z.array(z.string()).catch([]),
  recommendations: z.array(z.string()).catch([]),
});

export type GeminiVideoAnalysis = z.infer<typeof GeminiVideoAnalysisSchema>;

// ── GPT Aggregated Frame Analysis ────────────────────────────────────────────

export const GPTAggregatedSchema = z.object({
  framesAnalyzed: z.number().catch(0),
  averageQualityScore: z.number().min(0).max(100).catch(50),
  alertLevel: AlertLevelSchema,
  operationalMetrics: OperationalMetricsSchema.optional(),
  issueDetection: IssueDetectionSchema.optional(),
  performanceScoring: PerformanceScoringSchema.optional(),
  recipeCompliance: RecipeComplianceSchema.optional(),
  timeline: z
    .array(
      z.object({
        timestampSec: z.number().catch(0),
        frameIndex: z.number().catch(0),
        event: z.string().catch(""),
        severity: AlertLevelSchema,
      })
    )
    .catch([]),
  keyFindings: z.array(z.string()).catch([]),
  recommendations: z.array(z.string()).catch([]),
});

export type GPTAggregated = z.infer<typeof GPTAggregatedSchema>;

// ── Utility: Safe JSON extraction ────────────────────────────────────────────

export function extractFirstJSON(text: string): unknown {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Find first { or [ and try from there
  const startBrace = text.indexOf("{");
  const startBracket = text.indexOf("[");
  let start = -1;

  if (startBrace === -1 && startBracket === -1) {
    throw new Error("No JSON found in response");
  } else if (startBrace === -1) {
    start = startBracket;
  } else if (startBracket === -1) {
    start = startBrace;
  } else {
    start = Math.min(startBrace, startBracket);
  }

  // Find matching end by stack counting
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    if (c === closeChar) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          throw new Error("Failed to parse extracted JSON");
        }
      }
    }
  }

  throw new Error("Could not find complete JSON object");
}
