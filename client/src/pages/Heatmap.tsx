import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { heatmapApi } from "@/lib/api";
import type { HeatmapPoint } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Map as MapIcon,
  AlertTriangle,
  Building2,
  RefreshCw,
  MapPin,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { formatScore, getScoreColor } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#dc2626",
};

const RISK_LABELS: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  critical: "حرج",
};

// Saudi Arabia approx bounding box
const SA_BOUNDS = {
  minLat: 16.3,
  maxLat: 32.5,
  minLng: 34.5,
  maxLng: 55.7,
};

function project(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - SA_BOUNDS.minLng) / (SA_BOUNDS.maxLng - SA_BOUNDS.minLng)) * width;
  // invert y because SVG y grows downward
  const y =
    ((SA_BOUNDS.maxLat - lat) / (SA_BOUNDS.maxLat - SA_BOUNDS.minLat)) * height;
  return { x, y };
}

function PointTooltip({ point }: { point: HeatmapPoint }) {
  return (
    <div className="absolute left-2 top-2 z-10 bg-white border rounded-xl shadow-lg p-3 min-w-[240px] text-xs space-y-1">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-bold text-sm">{point.name}</p>
        <Badge
          style={{ backgroundColor: RISK_COLORS[point.risk], color: "white" }}
        >
          {RISK_LABELS[point.risk]}
        </Badge>
      </div>
      <p className="text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {point.city}
        {point.address ? ` • ${point.address}` : ""}
      </p>
      <div className="grid grid-cols-2 gap-1.5 pt-2">
        <div>
          <p className="text-muted-foreground">الكاميرات</p>
          <p className="font-medium">{point.cameras}</p>
        </div>
        <div>
          <p className="text-muted-foreground">الفيديوهات</p>
          <p className="font-medium">{point.videoCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">تنبيهات مفتوحة</p>
          <p className="font-medium text-red-600">{point.alerts.open}</p>
        </div>
        <div>
          <p className="text-muted-foreground">حرجة</p>
          <p className="font-medium text-red-600">{point.alerts.critical}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">متوسط الامتثال</p>
          <p
            className={`font-bold ${
              point.compliance.avgScore !== null
                ? getScoreColor(point.compliance.avgScore)
                : ""
            }`}
          >
            {point.compliance.avgScore !== null
              ? formatScore(point.compliance.avgScore)
              : "—"}
            <span className="text-muted-foreground font-normal">
              {" "}
              ({point.compliance.samples} قياس)
            </span>
          </p>
        </div>
      </div>
      {!point.hasExactCoords && (
        <p className="text-[10px] text-amber-600 pt-1 border-t mt-2">
          * موقع تقديري من مدينة الفرع
        </p>
      )}
    </div>
  );
}

function GeoMap({
  points,
  onSelect,
  selected,
}: {
  points: HeatmapPoint[];
  onSelect: (p: HeatmapPoint | null) => void;
  selected: HeatmapPoint | null;
}) {
  const width = 700;
  const height = 500;

  const projected = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        ...project(p.latitude, p.longitude, width, height),
      })),
    [points]
  );

  // Cluster points for heat blobs
  const maxVideos = Math.max(1, ...points.map((p) => p.videoCount));

  return (
    <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl border overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Stylized Saudi Arabia shape */}
        <defs>
          <radialGradient id="heat-gradient">
            <stop offset="0%" stopColor="rgba(239,68,68,0.5)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0)" />
          </radialGradient>
        </defs>

        {/* Simplified country outline (approx polygon) */}
        <path
          d="M 50 120 L 180 70 L 320 90 L 450 110 L 560 150 L 640 220 L 660 310 L 620 380 L 540 430 L 440 460 L 330 470 L 220 440 L 120 380 L 70 280 Z"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />

        {/* Heat blobs (video activity) */}
        {projected.map((p) => (
          <circle
            key={`heat-${p.storeId}`}
            cx={p.x}
            cy={p.y}
            r={10 + (p.videoCount / maxVideos) * 35}
            fill="url(#heat-gradient)"
          />
        ))}

        {/* Store markers */}
        {projected.map((p) => (
          <g
            key={`marker-${p.storeId}`}
            onClick={() => onSelect(p)}
            onMouseEnter={() => onSelect(p)}
            className="cursor-pointer"
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={selected?.storeId === p.storeId ? 10 : 7}
              fill={RISK_COLORS[p.risk]}
              stroke="white"
              strokeWidth="2"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={selected?.storeId === p.storeId ? 16 : 12}
              fill="none"
              stroke={RISK_COLORS[p.risk]}
              strokeWidth="1.5"
              opacity="0.4"
            />
          </g>
        ))}

        {/* City labels */}
        {projected.map((p) => (
          <text
            key={`lbl-${p.storeId}`}
            x={p.x + 10}
            y={p.y + 4}
            fontSize="11"
            fill="#334155"
            className="pointer-events-none select-none"
            style={{ fontFamily: "Cairo, sans-serif" }}
          >
            {p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name}
          </text>
        ))}
      </svg>

      {selected && <PointTooltip point={selected} />}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/95 border rounded-lg p-2 text-[11px] space-y-1">
        <p className="font-bold mb-1">مستوى الخطر</p>
        {Object.entries(RISK_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: RISK_COLORS[k] }}
            />
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Heatmap() {
  const [selected, setSelected] = useState<HeatmapPoint | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["heatmap"],
    queryFn: heatmapApi.get,
    refetchInterval: 30_000,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">خريطة الحرارة</h1>
          <p className="text-muted-foreground text-sm">
            التوزيع الجغرافي للفروع ومؤشرات الجودة حسب المنطقة
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`w-4 h-4 ml-2 ${isRefetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">جارٍ تحميل الخريطة...</div>
      ) : !data ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">لا توجد بيانات</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي الفروع</p>
                    <p className="text-2xl font-bold">{data.summary.totalStores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">فروع حرجة</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.summary.criticalStores}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">مخاطر مرتفعة</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.summary.highRiskStores}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المدن المشمولة</p>
                    <p className="text-2xl font-bold">{data.summary.citiesCovered}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map + cities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapIcon className="w-5 h-5 text-blue-500" />
                    الخريطة التفاعلية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GeoMap
                    points={data.points}
                    selected={selected}
                    onSelect={setSelected}
                  />
                </CardContent>
              </Card>
            </div>

            {/* City breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  حسب المدينة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.cities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد بيانات
                  </p>
                ) : (
                  data.cities.map((c) => (
                    <div
                      key={c.city}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{c.city}</p>
                        <Badge variant="secondary">{c.stores} فرع</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">فيديوهات</p>
                          <p className="font-medium">{c.videos}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">تنبيهات</p>
                          <p className="font-medium text-red-600">{c.openAlerts}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">الامتثال</p>
                          <p
                            className={`font-bold ${
                              c.avgScore !== null ? getScoreColor(c.avgScore) : ""
                            }`}
                          >
                            {c.avgScore !== null ? formatScore(c.avgScore) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store list (table) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                ترتيب الفروع حسب الخطر
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="text-right p-3 font-medium">الفرع</th>
                      <th className="text-right p-3 font-medium">المدينة</th>
                      <th className="text-right p-3 font-medium">الخطر</th>
                      <th className="text-right p-3 font-medium">الامتثال</th>
                      <th className="text-right p-3 font-medium">تنبيهات مفتوحة</th>
                      <th className="text-right p-3 font-medium">حرجة</th>
                      <th className="text-right p-3 font-medium">فيديوهات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.points]
                      .sort((a, b) => {
                        const order = { critical: 0, high: 1, medium: 2, low: 3 };
                        return order[a.risk] - order[b.risk];
                      })
                      .map((p) => (
                        <tr
                          key={p.storeId}
                          className="border-t hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelected(p)}
                        >
                          <td className="p-3 font-medium">{p.name}</td>
                          <td className="p-3 text-muted-foreground">{p.city}</td>
                          <td className="p-3">
                            <Badge
                              style={{
                                backgroundColor: RISK_COLORS[p.risk],
                                color: "white",
                              }}
                            >
                              {RISK_LABELS[p.risk]}
                            </Badge>
                          </td>
                          <td
                            className={`p-3 font-medium ${
                              p.compliance.avgScore !== null
                                ? getScoreColor(p.compliance.avgScore)
                                : ""
                            }`}
                          >
                            {p.compliance.avgScore !== null
                              ? formatScore(p.compliance.avgScore)
                              : "—"}
                          </td>
                          <td className="p-3">{p.alerts.open}</td>
                          <td className="p-3 text-red-600">{p.alerts.critical}</td>
                          <td className="p-3">{p.videoCount}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
