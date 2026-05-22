import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Diamond,
  Receipt,
  Gavel,
  FileSignature,
  AlertOctagon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, formatSar } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const { data: trend } = useQuery({
    queryKey: ["admin-revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const chartData = (trend ?? []).map((row) => ({
    day: row.day.slice(5),
    revenue: Number(row.total_halalas) / 100,
    fees: Number(row.fee_halalas) / 100,
    rentals: Number(row.rentals),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Platform-wide metrics and moderation queues
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Users}
          label="Total Users"
          value={isLoading ? "…" : String(data?.users ?? 0)}
          color="blue"
        />
        <KpiCard
          icon={Diamond}
          label="Listed Assets"
          value={isLoading ? "…" : String(data?.listedAssets ?? 0)}
          color="amber"
        />
        <KpiCard
          icon={TrendingUp}
          label="Rented Now"
          value={isLoading ? "…" : String(data?.rentedAssets ?? 0)}
          color="green"
        />
        <KpiCard
          icon={Receipt}
          label="Rentals (MTD)"
          value={isLoading ? "…" : String(data?.rentalsThisMonth ?? 0)}
          color="purple"
        />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">
              Gross Revenue
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? "…" : formatSar(data?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">
              Platform Fees
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? "…" : formatSar(data?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
              VAT Collected
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? "…" : formatSar(data?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="feesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#a3a3a3" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#a3a3a3" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e5e5",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} SAR`,
                      name === "revenue" ? "Revenue" : "Fees",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="fees"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#feesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <Gavel className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Open Disputes</p>
                  <p className="text-xl font-bold">
                    {isLoading ? "…" : data?.openDisputes ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <FileSignature className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Active Sanads</p>
                  <p className="text-xl font-bold">
                    {isLoading ? "…" : data?.activeSanads ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Under Execution</p>
                  <p className="text-xl font-bold">
                    {isLoading ? "…" : data?.sanadsUnderExecution ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: "blue" | "amber" | "green" | "purple";
}) {
  const bgMap = {
    blue: "bg-blue-50",
    amber: "bg-amber-50",
    green: "bg-green-50",
    purple: "bg-purple-50",
  };
  const iconColorMap = {
    blue: "text-blue-600",
    amber: "text-amber-600",
    green: "text-green-600",
    purple: "text-purple-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bgMap[color]} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColorMap[color]}`} />
          </div>
          <div>
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
