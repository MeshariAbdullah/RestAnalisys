import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar, halalasToSar } from "@/lib/api";

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

  const chartData = trend.map((t) => ({
    date: new Date(t.day).toLocaleDateString("en-SA", {
      month: "short",
      day: "numeric",
    }),
    revenue: halalasToSar(Number(t.total_halalas)),
    fees: halalasToSar(Number(t.fee_halalas)),
    rentals: Number(t.rentals),
  }));

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalFees = chartData.reduce((s, d) => s + d.fees, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
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

      <h2 className="text-lg font-semibold mb-3">Revenue trend (last 30 days)</h2>
      <Card className="mb-8">
        <CardContent className="p-6">
          {chartData.length === 0 ? (
            <p className="text-neutral-500 text-sm">No recent rentals.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="feesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} SAR`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} SAR`,
                    name === "revenue" ? "Revenue" : "Platform Fees",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#f59e0b"
                  fill="url(#revenueGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="fees"
                  name="Platform Fees"
                  stroke="#6366f1"
                  fill="url(#feesGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">Daily rentals</h2>
      <Card className="mb-8">
        <CardContent className="p-6">
          {chartData.length === 0 ? (
            <p className="text-neutral-500 text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="rentals" name="Rentals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">30-day summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <BarChart3 className="w-4 h-4" />
              Total rentals (30d)
            </div>
            <p className="text-3xl font-bold">
              {chartData.reduce((s, d) => s + d.rentals, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Avg daily revenue
            </div>
            <p className="text-3xl font-bold">
              {chartData.length > 0
                ? `${Math.round(totalRevenue / chartData.length).toLocaleString()} SAR`
                : "0 SAR"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
