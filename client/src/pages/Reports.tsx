import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDate, getScoreBg } from "@/lib/utils";

const PERIODS = [
  { value: "daily", label: "يومي" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
] as const;

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function Reports() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", period],
    queryFn: () => dashboardApi.getReport(period),
  });

  const summary = report?.summary;

  // Build compliance trend
  const complianceByDate = report?.compliance?.reduce(
    (acc: Record<string, number[]>, c) => {
      const date = c.createdAt.slice(0, 10);
      if (!acc[date]) acc[date] = [];
      acc[date].push(c.scoreTotal);
      return acc;
    },
    {}
  );

  const complianceTrend = Object.entries(complianceByDate ?? {}).map(([date, scores]) => ({
    date,
    avgScore: scores.reduce((s, n) => s + n, 0) / scores.length,
  }));

  // Alert severity breakdown
  const alertBySeverity = [
    { name: "حرج", value: report?.alerts?.filter((a) => a.severity === "critical").length ?? 0 },
    { name: "مرتفع", value: report?.alerts?.filter((a) => a.severity === "high").length ?? 0 },
    { name: "متوسط", value: report?.alerts?.filter((a) => a.severity === "medium").length ?? 0 },
    { name: "منخفض", value: report?.alerts?.filter((a) => a.severity === "low").length ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-muted-foreground text-sm">تقارير الجودة والامتثال</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جارٍ تحميل التقرير...</div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">مقاطع الفيديو</p>
                  <p className="text-2xl font-bold">{summary.totalVideos}</p>
                  <p className="text-xs text-green-600 mt-1">✓ {summary.doneVideos} مكتمل</p>
                  {summary.errorVideos > 0 && (
                    <p className="text-xs text-red-600">✗ {summary.errorVideos} خطأ</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي التنبيهات</p>
                  <p className="text-2xl font-bold">{summary.totalAlerts}</p>
                  <p className="text-xs text-red-600 mt-1">🔴 {summary.criticalAlerts} حرج</p>
                  <p className="text-xs text-orange-600">🟠 {summary.highAlerts} مرتفع</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">متوسط الامتثال</p>
                  <p className={`text-2xl font-bold ${summary.avgComplianceScore >= 75 ? "text-green-600" : summary.avgComplianceScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                    {summary.avgComplianceScore}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{summary.complianceChecks} فحص</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">معدل النجاح</p>
                  <p className="text-2xl font-bold">
                    {summary.totalVideos > 0
                      ? Math.round((summary.doneVideos / summary.totalVideos) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">معدل إتمام التحليل</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">اتجاه الامتثال</CardTitle>
              </CardHeader>
              <CardContent>
                {complianceTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={complianceTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(1)}%`, "متوسط الامتثال"]}
                        labelFormatter={(l) => new Date(l).toLocaleDateString("ar-SA")}
                      />
                      <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات امتثال</div>
                )}
              </CardContent>
            </Card>

            {/* Alert severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">توزيع التنبيهات حسب الخطورة</CardTitle>
              </CardHeader>
              <CardContent>
                {alertBySeverity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={alertBySeverity}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {alertBySeverity.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                      لا توجد تنبيهات في هذه الفترة
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Videos table */}
          {report?.videos && report.videos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">مقاطع الفيديو المحللة</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right py-3 px-4 font-medium">الملف</th>
                        <th className="text-right py-3 px-4 font-medium">الفرع</th>
                        <th className="text-right py-3 px-4 font-medium">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.videos.slice(0, 10).map((v) => (
                        <tr key={v.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 truncate max-w-[200px]">{v.originalName}</td>
                          <td className="py-3 px-4">فرع #{v.storeId}</td>
                          <td className="py-3 px-4">
                            <Badge variant={v.status === "done" ? "success" : v.status === "error" ? "error" : "secondary"}>
                              {v.status === "done" ? "مكتمل" : v.status === "error" ? "خطأ" : v.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(v.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance results table */}
          {report?.compliance && report.compliance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">نتائج الامتثال التفصيلية</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right py-3 px-4 font-medium">الفيديو</th>
                        <th className="text-right py-3 px-4 font-medium">المزود</th>
                        <th className="text-right py-3 px-4 font-medium">الدرجة الكلية</th>
                        <th className="text-right py-3 px-4 font-medium">المكونات</th>
                        <th className="text-right py-3 px-4 font-medium">السلامة</th>
                        <th className="text-right py-3 px-4 font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.compliance.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4">فيديو #{c.videoId}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${c.provider === "gemini" ? "badge-gemini" : "badge-gpt"}`}>
                              {c.provider === "gemini" ? "Gemini" : "GPT-4o"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreBg(c.scoreTotal)}`}>
                              {Math.round(c.scoreTotal)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {c.ingredientPresenceScore != null ? `${Math.round(c.ingredientPresenceScore)}%` : "—"}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {c.safetyScore != null ? `${Math.round(c.safetyScore)}%` : "—"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
