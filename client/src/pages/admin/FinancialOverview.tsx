import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
  const trend = (trendQuery.data ?? []).map((t) => ({
    day: new Date(t.day).toLocaleDateString("en-SA", { month: "short", day: "numeric" }),
    revenue: halalasToSar(Number(t.total_halalas)),
    fees: halalasToSar(Number(t.fee_halalas)),
    rentals: Number(t.rentals),
  }));

  const totalRevenue = trend.reduce((s, t) => s + t.revenue, 0);
  const totalFees = trend.reduce((s, t) => s + t.fees, 0);
  const totalRentals = trend.reduce((s, t) => s + t.rentals, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      {/* Top-level KPIs */}
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
              <Wallet className="w-4 h-4" />
              VAT collected (15%)
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend area chart */}
      <h2 className="text-lg font-semibold mb-3">Last 30 Days — Revenue Trend</h2>
      <Card className="mb-8">
        <CardContent className="p-6">
          {trend.length === 0 ? (
            <p className="text-neutral-500 text-sm">No recent rentals.</p>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-4 text-sm text-neutral-500">
                <span>Period total: <strong className="text-neutral-900">{totalRevenue.toLocaleString()} SAR</strong></span>
                <span>Fees: <strong className="text-amber-600">{totalFees.toLocaleString()} SAR</strong></span>
                <span>Rentals: <strong className="text-neutral-900">{totalRentals}</strong></span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} SAR`,
                      name === "revenue" ? "Revenue" : "Platform Fee",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f59e0b"
                    fill="url(#revGrad)"
                    strokeWidth={2}
                    name="revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="fees"
                    stroke="#3b82f6"
                    fill="url(#feeGrad)"
                    strokeWidth={2}
                    name="fees"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Daily breakdown table */}
      <h2 className="text-lg font-semibold mb-3">Daily Breakdown</h2>
      <Card>
        <CardContent className="p-0">
          {trend.length === 0 ? (
            <div className="p-6 text-neutral-500 text-sm">No recent rentals.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-right p-4 font-medium">Revenue</th>
                  <th className="text-right p-4 font-medium">Platform Fee</th>
                  <th className="text-right p-4 font-medium">Rentals</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.day} className="border-b last:border-0">
                    <td className="p-4 text-neutral-600">{t.day}</td>
                    <td className="p-4 text-right font-mono">{t.revenue.toLocaleString()} SAR</td>
                    <td className="p-4 text-right font-mono text-amber-600">{t.fees.toLocaleString()} SAR</td>
                    <td className="p-4 text-right">{t.rentals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
