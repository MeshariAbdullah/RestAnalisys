import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
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

  const lateQuery = useQuery({
    queryKey: ["late-returns"],
    queryFn: () =>
      adminApi.kpis().then(() =>
        fetch("/api/admin/late-returns", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }).then((r) => r.json())
      ),
  });

  const kpis = kpisQuery.data;

  const chartData = (trendQuery.data ?? []).map((t) => ({
    date: new Date(t.day).toLocaleDateString("en-SA", {
      month: "short",
      day: "numeric",
    }),
    revenue: halalasToSar(Number(t.total_halalas)),
    fees: halalasToSar(Number(t.fee_halalas)),
    rentals: Number(t.rentals),
  }));

  const totalRevenue = kpis?.revenue.rentalSubtotalHalalas ?? 0;
  const totalFees = kpis?.revenue.platformFeeHalalas ?? 0;
  const totalVat = kpis?.revenue.vatHalalas ?? 0;
  const netRevenue = totalFees + totalVat;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees, VAT, and rental trends across all confirmed rentals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(totalFees)}
            </p>
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
        <Card className="bg-gradient-to-br from-green-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <BarChart3 className="w-4 h-4" />
              Net platform income
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatSar(netRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="mb-8">
        <TabsList>
          <TabsTrigger value="revenue">Revenue trend</TabsTrigger>
          <TabsTrigger value="volume">Rental volume</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-neutral-500 mb-4">
                Revenue — last 30 days (SAR)
              </h3>
              {chartData.length === 0 ? (
                <p className="text-neutral-400 text-sm py-8 text-center">
                  No rental data in the last 30 days.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => `${value.toLocaleString()} SAR`}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e5e5",
                        fontSize: "13px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f59e0b"
                      fill="url(#gradRevenue)"
                      strokeWidth={2}
                      name="Total revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="fees"
                      stroke="#10b981"
                      fill="url(#gradFees)"
                      strokeWidth={2}
                      name="Platform fees"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-neutral-500 mb-4">
                Rental volume — last 30 days
              </h3>
              {chartData.length === 0 ? (
                <p className="text-neutral-400 text-sm py-8 text-center">
                  No rental data in the last 30 days.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e5e5",
                        fontSize: "13px",
                      }}
                    />
                    <Bar
                      dataKey="rentals"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      name="Rentals"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <h2 className="text-lg font-semibold mb-3">Overdue rentals</h2>
      <Card>
        <CardContent className="p-6">
          {!lateQuery.data || !Array.isArray(lateQuery.data) || lateQuery.data.length === 0 ? (
            <p className="text-neutral-400 text-sm text-center py-4">
              No overdue rentals.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="pb-2 pr-4">Reference</th>
                    <th className="pb-2 pr-4">Asset</th>
                    <th className="pb-2 pr-4">Renter</th>
                    <th className="pb-2 pr-4">Due date</th>
                    <th className="pb-2">Days overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {(lateQuery.data as any[]).map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.reference}
                      </td>
                      <td className="py-2 pr-4">{r.asset_title}</td>
                      <td className="py-2 pr-4">{r.renter_name}</td>
                      <td className="py-2 pr-4">
                        {new Date(r.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.days_overdue > 7
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {r.days_overdue} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
