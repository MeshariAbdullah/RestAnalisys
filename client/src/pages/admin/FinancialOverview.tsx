import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar, halalasToSar } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function FinancialOverview() {
  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const isError = kpisQuery.isError || trendQuery.isError;

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];

  const chartData = trend.map((t) => ({
    date: new Date(t.day).toLocaleDateString("en-SA", {
      month: "short",
      day: "numeric",
    }),
    revenue: halalasToSar(Number(t.total_halalas ?? 0)),
    rentals: Number(t.rentals ?? 0),
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      {isError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-4">
          Failed to load data. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Gross revenue
            </div>
            <p className="text-3xl font-bold">
              {kpisQuery.isLoading ? (
                <span className="text-neutral-400 text-lg">Loading...</span>
              ) : (
                formatSar(kpis?.revenue.rentalSubtotalHalalas)
              )}
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
              {kpisQuery.isLoading ? (
                <span className="text-neutral-400 text-lg">Loading...</span>
              ) : (
                formatSar(kpis?.revenue.platformFeeHalalas)
              )}
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
              {kpisQuery.isLoading ? (
                <span className="text-neutral-400 text-lg">Loading...</span>
              ) : (
                formatSar(kpis?.revenue.vatHalalas)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Last 30 days</h2>
      <Card>
        <CardContent className="p-6">
          {trendQuery.isLoading ? (
            <p className="text-neutral-500 text-sm">Loading...</p>
          ) : trend.length === 0 ? (
            <p className="text-neutral-500 text-sm">No recent rentals.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v} SAR`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof chartData)[number];
                    return (
                      <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
                        <p className="font-medium">{d.date}</p>
                        <p className="text-amber-600">
                          {d.revenue.toLocaleString("en-SA", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}{" "}
                          SAR
                        </p>
                        <p className="text-neutral-500">
                          {d.rentals} {d.rentals === 1 ? "rental" : "rentals"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
