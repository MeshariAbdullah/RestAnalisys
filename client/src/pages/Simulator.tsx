import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storesApi, recipesApi, videosApi } from "@/lib/api";
import type { VideoResults } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Play,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  BarChart2,
  RefreshCw,
  Video,
  Clock,
} from "lucide-react";
import { formatDate, getStatusLabel, getStatusIcon, formatScore, getScoreBg, getSeverityColor, getSeverityLabel } from "@/lib/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const STATUS_STEPS = [
  { key: "uploaded", label: "تم الرفع" },
  { key: "extracting_frames", label: "استخراج الإطارات" },
  { key: "analyzing_gpt", label: "تحليل GPT-4o" },
  { key: "analyzing_gemini", label: "تحليل Gemini" },
  { key: "saving_results", label: "حفظ النتائج" },
  { key: "done", label: "مكتمل" },
];

function StatusStepper({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  const isError = status === "error";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STATUS_STEPS.map((step, i) => {
        const done = i < currentIdx || status === "done";
        const active = i === currentIdx && !isError;
        return (
          <React.Fragment key={step.key}>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isError && i === currentIdx
                  ? "bg-red-100 text-red-700"
                  : done
                  ? "bg-green-100 text-green-700"
                  : active
                  ? "bg-blue-100 text-blue-700 animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle className="w-3 h-3" /> : active ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
              {step.label}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-px flex-1 min-w-4 ${done ? "bg-green-300" : "bg-muted"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : score >= 50 ? "#f97316" : "#ef4444";
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 94.2} 94.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ComplianceScores({ compliance }: { compliance: Record<string, unknown> }) {
  const scores = [
    { label: "المكونات", key: "ingredientPresenceScore" },
    { label: "ترتيب التحضير", key: "assemblyOrderScore" },
    { label: "الحصة", key: "portionScore" },
    { label: "التقديم", key: "presentationScore" },
    { label: "السلامة", key: "safetyScore" },
  ];

  const radarData = scores.map((s) => ({
    subject: s.label,
    score: ((compliance[s.key] as number) ?? 0),
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <Radar name="درجة" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          <Tooltip formatter={(v) => [`${v}%`]} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2">
        {scores.map((s) => (
          <div key={s.key} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-xs">{s.label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreBg((compliance[s.key] as number) ?? 0)}`}>
              {Math.round((compliance[s.key] as number) ?? 0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderResults({
  title,
  icon,
  color,
  data,
  complianceData,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  data: Record<string, unknown> | null;
  complianceData?: Record<string, unknown>;
  badge?: string;
}) {
  if (!data) {
    return (
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 ${color}`}>
            {icon} {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد نتائج بعد</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const norm = data as Record<string, unknown>;
  const overall = (norm.overallQualityScore ?? norm.averageQualityScore) as number;
  const alertLevel = norm.alertLevel as string;
  const timeline = (norm.timeline ?? []) as Array<{ timestampSec: number; event: string; severity: string; description?: string }>;
  const keyFindings = (norm.keyFindings ?? []) as string[];
  const recommendations = (norm.recommendations ?? []) as string[];
  const opMetrics = (norm.operationalMetrics ?? null) as Record<string, number | string> | null;
  const perf = (norm.performanceScoring ?? null) as Record<string, unknown> | null;
  const issues = (norm.issueDetection ?? null) as Record<string, unknown> | null;

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-base flex items-center gap-2 ${color}`}>
            {icon} {title}
          </CardTitle>
          {badge && <span className="text-xs text-muted-foreground">{badge}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary score */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <ScoreGauge score={overall ?? 50} label="الجودة الكلية" />
          <div className="flex-1">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${getSeverityColor(alertLevel)}`}>
              <AlertTriangle className="w-3 h-3" />
              مستوى التنبيه: {getSeverityLabel(alertLevel)}
            </div>
            {norm.summary != null ? (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{String(norm.summary)}</p>
            ) : null}
            {norm.framesAnalyzed != null ? (
              <p className="text-xs text-muted-foreground mt-1">{Number(norm.framesAnalyzed)} إطار محلل</p>
            ) : null}
          </div>
        </div>

        {opMetrics != null ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">النظافة</p>
              <p className="text-sm font-bold">{Math.round((opMetrics.hygieneScore as number) ?? 0)}%</p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">الكفاءة</p>
              <p className="text-sm font-bold">{Math.round((opMetrics.workflowEfficiency as number) ?? 0)}%</p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">الموظفون</p>
              <p className="text-sm font-bold">{(opMetrics.staffCount as number) ?? 0}</p>
            </div>
          </div>
        ) : null}

        {/* Issues */}
        {issues != null && Array.isArray(issues.safetyViolations) && (issues.safetyViolations as string[]).length > 0 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-bold text-red-700 mb-1">⚠️ انتهاكات السلامة</p>
            <ul className="space-y-0.5">
              {(issues.safetyViolations as string[]).slice(0, 3).map((v, i) => (
                <li key={i} className="text-xs text-red-600">• {v}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Compliance */}
        {complianceData && (
          <div>
            <p className="text-sm font-medium mb-2">امتثال الوصفة</p>
            <ComplianceScores compliance={complianceData} />
          </div>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">الجدول الزمني للأحداث</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {timeline.slice(0, 10).map((event, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-1.5 bg-muted/30 rounded">
                  <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${getSeverityColor(event.severity)}`}>
                    {Math.round(event.timestampSec)}ث
                  </span>
                  <span className="text-muted-foreground">{event.event} {event.description ? `- ${event.description}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key findings */}
        {keyFindings.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1">الاكتشافات الرئيسية</p>
            <ul className="space-y-0.5">
              {keyFindings.slice(0, 4).map((f, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Simulator() {
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedRecipe, setSelectedRecipe] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: storesApi.list,
  });

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: recipesApi.list,
  });

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["video-status", uploadedVideoId],
    queryFn: () => videosApi.getStatus(uploadedVideoId!),
    enabled: !!uploadedVideoId && pollingEnabled,
    refetchInterval: (query) => {
      if (!pollingEnabled) return false;
      const statusData = query.state.data as { status?: string } | undefined;
      const done = statusData?.status === "done" || statusData?.status === "error";
      if (done) {
        setPollingEnabled(false);
        queryClient.invalidateQueries({ queryKey: ["video-results", uploadedVideoId] });
      }
      return done ? false : 2000;
    },
  });

  const { data: results } = useQuery({
    queryKey: ["video-results", uploadedVideoId],
    queryFn: () => videosApi.getResults(uploadedVideoId!),
    enabled: !!uploadedVideoId && status?.status === "done",
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      videosApi.upload(file!, parseInt(selectedStore), selectedRecipe ? parseInt(selectedRecipe) : undefined),
    onSuccess: (video) => {
      setUploadedVideoId(video.id);
    },
  });

  const startAnalysisMutation = useMutation({
    mutationFn: () => videosApi.startAnalysis(uploadedVideoId!),
    onSuccess: () => {
      setPollingEnabled(true);
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) setFile(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const canUpload = !!file && !!selectedStore;
  const canStartAnalysis = !!uploadedVideoId && status?.status !== "analyzing_gpt" && status?.status !== "analyzing_gemini" && status?.status !== "extracting_frames";
  const isAnalyzing = pollingEnabled && !!status?.status && !["done", "error", "uploaded"].includes(status.status);

  const geminiNorm = results?.gemini?.normalizedJson as Record<string, unknown> | null ?? null;

  // Aggregate GPT data
  let gptAgg: Record<string, unknown> | null = null;
  if (results?.gpt?.analyses && results.gpt.analyses.length > 0) {
    const firstValid = results.gpt.analyses.find((a) => a.normalizedJson);
    if (firstValid?.normalizedJson) {
      gptAgg = {
        framesAnalyzed: results.gpt.framesAnalyzed,
        ...(firstValid.normalizedJson as Record<string, unknown>),
      };
    }
  }

  const geminiCompliance = results?.compliance?.find((c) => c.provider === "gemini");
  const gptCompliance = results?.compliance?.find((c) => c.provider === "gpt_frames");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">محاكي الكاميرا</h1>
        <p className="text-muted-foreground text-sm">رفع فيديو وتحليله بـ Gemini + GPT-4o</p>
      </div>

      {/* Missing providers warning */}
      {(results?.missingProviders?.gemini || results?.missingProviders?.openai) && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">مزودو الذكاء الاصطناعي غير مكتملين</p>
            <ul className="mt-1 space-y-0.5">
              {results?.missingProviders?.gemini && (
                <li className="text-xs text-yellow-700">• GEMINI_API_KEY غير مضبوط - تحليل الفيديو الكامل غير متاح</li>
              )}
              {results?.missingProviders?.openai && (
                <li className="text-xs text-yellow-700">• OPENAI_API_KEY غير مضبوط - تحليل الإطارات غير متاح</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">إعداد التحليل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store selection */}
            <div>
              <Label>الفرع *</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} - {s.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipe selection */}
            <div>
              <Label>الوصفة (اختياري)</Label>
              <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر وصفة للمقارنة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون وصفة</SelectItem>
                  {recipes?.filter((r) => r.isActive).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} v{r.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video upload */}
            <div>
              <Label>الفيديو (MP4) *</Label>
              <div
                className={`upload-zone mt-1 ${dragOver ? "drag-over" : ""}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Video className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">اسحب الفيديو هنا أو انقر للاختيار</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">MP4 حتى 500MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {!uploadedVideoId ? (
                <Button
                  className="w-full"
                  disabled={!canUpload || uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                >
                  <Upload className="w-4 h-4 ml-2" />
                  {uploadMutation.isPending ? "جارٍ الرفع..." : "رفع الفيديو"}
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!canStartAnalysis || startAnalysisMutation.isPending || isAnalyzing}
                    onClick={() => startAnalysisMutation.mutate()}
                  >
                    <Play className="w-4 h-4 ml-2" />
                    {isAnalyzing ? "جارٍ التحليل..." : "بدء التحليل المزدوج"}
                  </Button>
                  {status?.status === "error" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => startAnalysisMutation.mutate()}
                    >
                      <RefreshCw className="w-4 h-4 ml-2" />
                      إعادة المحاولة
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => {
                      setUploadedVideoId(null);
                      setFile(null);
                      setPollingEnabled(false);
                    }}
                  >
                    رفع فيديو جديد
                  </Button>
                </>
              )}
            </div>

            {/* Status stepper */}
            {status && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-3">حالة التحليل</p>
                <StatusStepper status={status.status} />
                {status.framesExtracted > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {status.framesExtracted} إطار مستخرج
                    {status.durationSec && ` • ${Math.round(status.durationSec)} ثانية`}
                  </p>
                )}
                {status.status === "error" && status.errorMessage && (
                  <p className="text-xs text-red-600 mt-2">{status.errorMessage}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Agreement score */}
          {results?.agreementPct !== null && results?.agreementPct !== undefined && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">نسبة الاتفاق بين المزودين</p>
                    <p className="text-xs text-blue-600 mt-0.5">Gemini vs GPT-4o</p>
                  </div>
                  <div className="text-4xl font-bold text-blue-700">
                    {Math.round(results.agreementPct)}%
                  </div>
                </div>
                <Progress value={results.agreementPct} className="mt-3 h-2" />
              </CardContent>
            </Card>
          )}

          {/* Compliance total scores */}
          {(geminiCompliance || gptCompliance) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">درجات امتثال الوصفة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {geminiCompliance && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium mb-2">Gemini</p>
                      <p className="text-3xl font-bold text-blue-700">{Math.round(geminiCompliance.scoreTotal)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">درجة الامتثال</p>
                    </div>
                  )}
                  {gptCompliance && (
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium mb-2">GPT-4o</p>
                      <p className="text-3xl font-bold text-green-700">{Math.round(gptCompliance.scoreTotal)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">درجة الامتثال</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Side-by-side results */}
          <div className="flex gap-4">
            <ProviderResults
              title="Gemini 1.5 Pro"
              icon={<Brain className="w-4 h-4" />}
              color="text-blue-600"
              data={geminiNorm}
              complianceData={geminiCompliance ? {
                ingredientPresenceScore: geminiCompliance.ingredientPresenceScore ?? 0,
                assemblyOrderScore: geminiCompliance.assemblyOrderScore ?? 0,
                portionScore: geminiCompliance.portionScore ?? 0,
                presentationScore: geminiCompliance.presentationScore ?? 0,
                safetyScore: geminiCompliance.safetyScore ?? 0,
              } : undefined}
              badge="تحليل الفيديو الكامل"
            />
            <ProviderResults
              title="GPT-4o Vision"
              icon={<Zap className="w-4 h-4" />}
              color="text-green-600"
              data={gptAgg}
              complianceData={gptCompliance ? {
                ingredientPresenceScore: gptCompliance.ingredientPresenceScore ?? 0,
                assemblyOrderScore: gptCompliance.assemblyOrderScore ?? 0,
                portionScore: gptCompliance.portionScore ?? 0,
                presentationScore: gptCompliance.presentationScore ?? 0,
                safetyScore: gptCompliance.safetyScore ?? 0,
              } : undefined}
              badge={`${results?.gpt?.framesAnalyzed ?? 0} إطار`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
