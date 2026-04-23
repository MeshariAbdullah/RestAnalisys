import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    day: new Date(t.day).toLocaleDateString("en-SA", {
      month: "short",
      day: "numeric",
    }),
    total: halalasToSar(Number(t.total_halalas ?? 0)),
    fees: halalasToSar(Number(t.fee_halalas ?? 0)),
    rentals: Number(t.rentals ?? 0),
  }));

  const totalRevenue = trend.reduce((s, t) => s + t.total, 0);
  const totalFees = trend.reduce((s, t) => s + t.fees, 0);
  const totalRentals = trend.reduce((s, t) => s + t.rentals, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial Overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Gross Revenue
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.rentalSubtotalHalalas)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              30-day: {totalRevenue.toLocaleString("en-SA")} SAR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <DollarSign className="w-4 h-4" />
              Platform Fees
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(kpis?.revenue.platformFeeHalalas)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              30-day: {totalFees.toLocaleString("en-SA")} SAR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              VAT Collected (15%)
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.vatHalalas)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {totalRentals} rentals in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="area" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Last 30 Days</h2>
          <TabsList>
            <TabsTrigger value="area">Trend</TabsTrigger>
            <TabsTrigger value="bar">Breakdown</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="area">
          <Card>
            <CardContent className="p-6">
              {trend.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">
                  No recent rental data.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v.toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} SAR`]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Revenue"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="fees"
                      name="Platform Fees"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFees)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar">
          <Card>
            <CardContent className="p-6">
              {trend.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">
                  No recent rental data.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "rentals"
                          ? value
                          : `${value.toLocaleString()} SAR`,
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="total"
                      name="Revenue (SAR)"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="fees"
                      name="Fees (SAR)"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="rentals"
                      name="Rentals"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
