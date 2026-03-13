import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatusLabel, getStatusIcon, getScoreColor } from "@/lib/utils";
import {
  Store,
  Video,
  AlertTriangle,
  TrendingUp,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: dashboardApi.getKPIs,
    refetchInterval: 5_000,
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: dashboardApi.getCharts,
    refetchInterval: 30_000,
  });

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-muted-foreground">جارٍ تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm">مراقبة الجودة في الوقت الفعلي</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchKPIs()}>
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="إجمالي الفروع"
          value={kpis?.stores ?? 0}
          icon={Store}
          color="bg-blue-500"
          sub="فرع نشط"
        />
        <KPICard
          title="مقاطع الفيديو"
          value={kpis?.totalVideos ?? 0}
          icon={Video}
          color="bg-purple-500"
          sub="إجمالي التحليلات"
        />
        <KPICard
          title="التنبيهات المفتوحة"
          value={kpis?.openAlerts ?? 0}
          icon={AlertTriangle}
          color={kpis && kpis.openAlerts > 0 ? "bg-red-500" : "bg-green-500"}
          sub={`${kpis?.criticalAlerts ?? 0} حرج`}
        />
        <KPICard
          title="متوسط الامتثال"
          value={kpis?.avgComplianceScore != null ? `${kpis.avgComplianceScore}%` : "—"}
          icon={TrendingUp}
          color="bg-green-500"
          sub="متوسط جميع التحليلات"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Videos by day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مقاطع الفيديو (7 أيام)</CardTitle>
          </CardHeader>
          <CardContent>
            {charts?.videosByDay && charts.videosByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={charts.videosByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [v, "مقطع"]}
                    labelFormatter={(l) => new Date(l).toLocaleDateString("ar-SA")}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات بعد
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance by provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الامتثال حسب المزود</CardTitle>
          </CardHeader>
          <CardContent>
            {charts?.complianceByProvider && charts.complianceByProvider.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={charts.complianceByProvider}
                    dataKey="avgScore"
                    nameKey="provider"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ provider, avgScore }) =>
                      `${provider === "gemini" ? "Gemini" : "GPT-4o"}: ${Number(avgScore).toFixed(0)}%`
                    }
                  >
                    {charts.complianceByProvider.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "متوسط الامتثال"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات امتثال بعد
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">نشاط الفروع</CardTitle>
          </CardHeader>
          <CardContent>
            {charts?.storeActivity && charts.storeActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={charts.storeActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="storeName" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v) => [v, "مقطع"]} />
                  <Bar dataKey="videoCount" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات فروع بعد
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent videos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر التحليلات</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis?.recentVideos && kpis.recentVideos.length > 0 ? (
              <div className="space-y-2">
                {kpis.recentVideos.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <span className="text-lg">{getStatusIcon(v.status)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.originalName}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</p>
                    </div>
                    <Badge
                      variant={v.status === "done" ? "success" : v.status === "error" ? "error" : "secondary"}
                    >
                      {getStatusLabel(v.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا توجد تحليلات بعد
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
