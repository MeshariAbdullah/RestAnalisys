import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import { extractFirstJSON, GeminiVideoAnalysisSchema } from "../utils/schemas.js";
import type { GeminiVideoAnalysis } from "../utils/schemas.js";

const GEMINI_MODEL = "gemini-1.5-pro";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenerativeAI(apiKey);
}

async function uploadVideoToGemini(filePath: string, mimeType = "video/mp4") {
  const genai = getClient();
  // Use the Files API via the SDK
  const fileManager = genai.getGenerativeModel({ model: GEMINI_MODEL });

  // Read file as buffer for upload
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString("base64");

  return { base64, mimeType };
}

function buildGeminiPrompt(recipeSpec?: Record<string, unknown>) {
  const recipeSection = recipeSpec
    ? `\n\nوصفة الطعام المحددة للتحليل:\n${JSON.stringify(recipeSpec, null, 2)}`
    : "";

  return `أنت نظام ذكاء اصطناعي متخصص في مراقبة جودة المطاعم والمطابخ.
حلل هذا الفيديو بشكل شامل وأرجع تقريراً مفصلاً بصيغة JSON فقط.

${recipeSection}

أرجع JSON بهذا الهيكل بالضبط:
{
  "summary": "ملخص شامل للفيديو",
  "overallQualityScore": 85,
  "qualityRating": "good",
  "alertLevel": "low",
  "timeline": [
    {"timestampSec": 0, "event": "اسم الحدث", "severity": "low", "description": "وصف"}
  ],
  "operationalMetrics": {
    "hygieneScore": 80,
    "crowdingLevel": "medium",
    "equipmentStatus": "operational",
    "staffCount": 3,
    "workflowEfficiency": 75,
    "temperatureControl": "ok",
    "cleanlinessLevel": 85,
    "notes": ""
  },
  "issueDetection": {
    "issues": [],
    "alertLevel": "low",
    "safetyViolations": [],
    "qualityIssues": [],
    "immediateActionRequired": false
  },
  "performanceScoring": {
    "overallScore": 80,
    "qualityRating": "good",
    "preparationTime": "normal",
    "portionAccuracy": 85,
    "presentationScore": 80,
    "staffPerformance": 75,
    "strengths": [],
    "improvements": []
  },
  ${recipeSpec ? `"recipeCompliance": {
    "ingredientPresenceScore": 0,
    "assemblyOrderScore": 0,
    "portionScore": 0,
    "presentationScore": 0,
    "safetyScore": 0,
    "totalScore": 0,
    "complianceStatus": "partial",
    "detectedIngredients": [],
    "missingIngredients": [],
    "safetyViolations": [],
    "reasons": []
  },` : ""}
  "keyFindings": ["اكتشاف 1", "اكتشاف 2"],
  "recommendations": ["توصية 1", "توصية 2"]
}

قيم alertLevel و severity: none, low, medium, high, critical
قيم qualityRating: excellent, good, fair, poor, critical
أرجع JSON نقي فقط بدون أي نص إضافي.`;
}

export async function analyzeVideoWithGemini(
  filePath: string,
  recipeSpec?: Record<string, unknown>
): Promise<{ raw: unknown; normalized: GeminiVideoAnalysis; summary: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: GEMINI_MODEL });

  // Upload video via Files API
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString("base64");

  const prompt = buildGeminiPrompt(recipeSpec);

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64,
        mimeType: "video/mp4",
      },
    },
    { text: prompt },
  ]);

  const responseText = result.response.text();
  const raw = extractFirstJSON(responseText);
  const normalized = GeminiVideoAnalysisSchema.parse(raw);

  return {
    raw,
    normalized,
    summary: normalized.summary,
  };
}
