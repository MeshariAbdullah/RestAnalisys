import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar, halalasToSar } from "@/lib/api";
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

  const totalRevenue = kpis?.revenue.rentalSubtotalHalalas ?? 0;
  const totalFees = kpis?.revenue.platformFeeHalalas ?? 0;
  const totalVat = kpis?.revenue.vatHalalas ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial Overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Gross Revenue
            </div>
            <p className="text-3xl font-bold">{formatSar(totalRevenue)}</p>
            <p className="text-xs text-neutral-400 mt-1">Total rental subtotals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <DollarSign className="w-4 h-4" />
              Platform Fees
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatSar(totalFees)}</p>
            <p className="text-xs text-neutral-400 mt-1">Platform commission earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              VAT Collected (15%)
            </div>
            <p className="text-3xl font-bold">{formatSar(totalVat)}</p>
            <p className="text-xs text-neutral-400 mt-1">ZATCA tax liability</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Revenue Trend (Last 30 Days)</h2>
      <Card>
        <CardContent className="p-6">
          {trend.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-12">
              No rental data in the last 30 days.
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#737373" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#737373" }}
                    tickFormatter={(v: number) => `${v.toLocaleString()} SAR`}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} SAR`,
                      name === "revenue" ? "Gross Revenue" : "Platform Fees",
                    ]}
                    labelStyle={{ fontWeight: 600 }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e5e5",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "revenue" ? "Gross Revenue" : "Platform Fees"
                    }
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fees" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
