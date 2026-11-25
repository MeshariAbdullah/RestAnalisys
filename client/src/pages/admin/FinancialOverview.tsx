import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar } from "@/lib/api";

export default function FinancialOverview() {
  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];

  const chartData = useMemo(
    () =>
      trend.map((t) => ({
        day: new Date(t.day).toLocaleDateString("en-SA", { month: "short", day: "numeric" }),
        totalSar: Number(t.total_halalas) / 100,
        feeSar: Number(t.fee_halalas) / 100,
        rentals: Number(t.rentals),
      })),
    [trend]
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Gross revenue
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              Platform fees
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(kpis?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              VAT collected (15%)
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Last 30 days</h2>
      <Card>
        <CardContent className="p-6">
          {chartData.length === 0 ? (
            <p className="text-neutral-500 text-sm">No recent rentals.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFee" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a3a3a3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#a3a3a3" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#a3a3a3"
                  tickFormatter={(v: number) => `${v.toLocaleString()} SAR`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e5e5",
                    fontSize: 13,
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString("en-SA", { minimumFractionDigits: 2 })} SAR`,
                    name === "totalSar" ? "Revenue" : "Platform fee",
                  ]}
                  labelFormatter={(label: string) => label}
                />
                <Legend
                  formatter={(value: string) =>
                    value === "totalSar" ? "Revenue" : "Platform fee"
                  }
                />
                <Area
                  type="monotone"
                  dataKey="totalSar"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="feeSar"
                  stroke="#a3a3a3"
                  strokeWidth={2}
                  fill="url(#gradFee)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
