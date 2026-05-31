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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar, halalasToSar } from "@/lib/api";

const PIE_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const rentalDistQuery = useQuery({
    queryKey: ["rental-distribution"],
    queryFn: () => adminApi.rentalDistribution(),
  });

  const trend = (trendQuery.data ?? []).map((t) => ({
    day: new Date(t.day).toLocaleDateString("en-SA", { month: "short", day: "numeric" }),
    revenue: halalasToSar(Number(t.total_halalas)),
    fees: halalasToSar(Number(t.fee_halalas)),
    rentals: Number(t.rentals),
  }));

  const rentalDist = (rentalDistQuery.data ?? []).map((r) => ({
    name: r.status.replace(/_/g, " "),
    value: Number(r.count),
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin overview</h1>
      <p className="text-neutral-500 mb-8">
        Platform-wide metrics and moderation queues.
      </p>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi icon={Users} label="Users" value={isLoading ? "..." : data?.users ?? 0} />
        <Kpi icon={Diamond} label="Listed assets" value={isLoading ? "..." : data?.listedAssets ?? 0} />
        <Kpi icon={TrendingUp} label="Rented assets" value={isLoading ? "..." : data?.rentedAssets ?? 0} />
        <Kpi icon={Receipt} label="Rentals this month" value={isLoading ? "..." : data?.rentalsThisMonth ?? 0} />
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Gross rental revenue</p>
            <p className="text-3xl font-bold">
              {isLoading ? "..." : formatSar(data?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Platform fees</p>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? "..." : formatSar(data?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">VAT collected</p>
            <p className="text-3xl font-bold">
              {isLoading ? "..." : formatSar(data?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue trend bar chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Revenue — Last 30 Days</h3>
            {trend.length === 0 ? (
              <p className="text-sm text-neutral-500">No recent rental data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} SAR`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} SAR`]}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Revenue" />
                  <Bar dataKey="fees" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Platform fee" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rental status distribution pie chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Rental Status Breakdown</h3>
            {rentalDist.length === 0 ? (
              <p className="text-sm text-neutral-500">No rentals yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={rentalDist}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {rentalDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Gavel className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-sm text-neutral-500">Open disputes</p>
                <p className="text-2xl font-bold">{isLoading ? "..." : data?.openDisputes ?? 0}</p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <FileSignature className="w-8 h-8 text-amber-500 mb-3" />
                <p className="text-sm text-neutral-500">Active Sanads</p>
                <p className="text-2xl font-bold">{isLoading ? "..." : data?.activeSanads ?? 0}</p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <AlertOctagon className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm text-neutral-500">Sanads under execution</p>
                <p className="text-2xl font-bold">{isLoading ? "..." : data?.sanadsUnderExecution ?? 0}</p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
