import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";
import {
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
    day: new Date(t.day).toLocaleDateString("en-SA", { month: "short", day: "numeric" }),
    revenue: halalasToSar(Number(t.total_halalas)),
    fees: halalasToSar(Number(t.fee_halalas)),
    rentals: Number(t.rentals),
  }));

  const totalRevenue = kpis?.revenue.rentalSubtotalHalalas ?? 0;
  const totalFees = kpis?.revenue.platformFeeHalalas ?? 0;
  const totalVat = kpis?.revenue.vatHalalas ?? 0;
  const netIncome = totalFees;
  const grossGmv = totalRevenue + totalFees + totalVat;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              GMV (total collected)
            </div>
            <p className="text-3xl font-bold">{formatSar(grossGmv)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <DollarSign className="w-4 h-4" />
              Gross rental revenue
            </div>
            <p className="text-3xl font-bold">
              {formatSar(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              Platform fees (net income)
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(netIncome)}
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
              {formatSar(totalVat)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Revenue trend — last 30 days</h2>
      <Card className="mb-8">
        <CardContent className="p-6">
          {chartData.length === 0 ? (
            <p className="text-neutral-500 text-sm py-12 text-center">
              No rental data in the last 30 days.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="day" fontSize={12} tick={{ fill: "#737373" }} />
                <YAxis
                  fontSize={12}
                  tick={{ fill: "#737373" }}
                  tickFormatter={(v) => `${v} SAR`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString("en-SA", { minimumFractionDigits: 2 })} SAR`,
                    name === "revenue" ? "Revenue" : "Platform fees",
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fees" name="Platform fees" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">Daily breakdown</h2>
      <Card>
        <CardContent className="p-0">
          {chartData.length === 0 ? (
            <p className="text-neutral-500 text-sm p-6">No data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">Fees</th>
                  <th className="text-right p-3 font-medium">Rentals</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.day} className="border-b">
                    <td className="p-3 text-neutral-600">
                      {new Date(t.day).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatSar(Number(t.total_halalas))}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-600">
                      {formatSar(Number(t.fee_halalas))}
                    </td>
                    <td className="p-3 text-right text-neutral-500">
                      {t.rentals}
                    </td>
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
