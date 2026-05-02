import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { adminApi, formatSar } from "@/lib/api";
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

function hToSar(h: string | number): number {
  return Number(h) / 100;
}

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
    totalSar: hToSar(t.total_halalas),
    feeSar: hToSar(t.fee_halalas),
    rentals: Number(t.rentals),
  }));

  const totalRevenue = kpis?.revenue.rentalSubtotalHalalas ?? 0;
  const totalFees = kpis?.revenue.platformFeeHalalas ?? 0;
  const totalVat = kpis?.revenue.vatHalalas ?? 0;

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
            <p className="text-3xl font-bold">{formatSar(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <DollarSign className="w-4 h-4" />
              Platform fees
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatSar(totalFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              VAT collected (15%)
            </div>
            <p className="text-3xl font-bold">{formatSar(totalVat)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart" className="mb-8">
        <TabsList>
          <TabsTrigger value="chart">Revenue Chart</TabsTrigger>
          <TabsTrigger value="breakdown">Fee Breakdown</TabsTrigger>
          <TabsTrigger value="table">Daily Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Revenue — Last 30 days</h2>
              {trend.length === 0 ? (
                <p className="text-neutral-500 text-sm py-8 text-center">No recent rental data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v.toLocaleString()} SAR`}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toLocaleString()} SAR`, "Revenue"]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalSar"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#fillTotal)"
                      name="Total Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Fees vs Revenue — Last 30 days</h2>
              {trend.length === 0 ? (
                <p className="text-neutral-500 text-sm py-8 text-center">No recent rental data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [
                        `${v.toLocaleString()} SAR`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="totalSar" name="Gross Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="feeSar" name="Platform Fee" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Daily breakdown</h2>
              {trend.length === 0 ? (
                <p className="text-neutral-500 text-sm">No recent rentals.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-neutral-500 text-left">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                        <th className="pb-2 font-medium text-right">Platform Fee</th>
                        <th className="pb-2 font-medium text-right">Rentals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((t) => (
                        <tr key={t.day} className="border-b border-neutral-100">
                          <td className="py-2 text-neutral-700">{t.day}</td>
                          <td className="py-2 text-right font-mono">{t.totalSar.toLocaleString()} SAR</td>
                          <td className="py-2 text-right font-mono text-amber-600">{t.feeSar.toLocaleString()} SAR</td>
                          <td className="py-2 text-right">{t.rentals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
