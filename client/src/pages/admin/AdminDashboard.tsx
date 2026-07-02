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
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar, halalasToSar } from "@/lib/api";

function RevenueChart({
  data,
}: {
  data: Array<{ day: string; total_halalas: string; fee_halalas: string; rentals: string }>;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">
        No revenue data for the last 30 days
      </div>
    );
  }

  const values = data.map((d) => Number(d.total_halalas));
  const fees = data.map((d) => Number(d.fee_halalas));
  const max = Math.max(...values, 1);
  const barWidth = Math.max(8, Math.floor(600 / data.length) - 4);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${data.length * (barWidth + 4) + 40} 200`}
        className="w-full h-48"
        preserveAspectRatio="xMinYMid meet"
      >
        {data.map((d, i) => {
          const totalH = (Number(d.total_halalas) / max) * 160;
          const feeH = (Number(d.fee_halalas) / max) * 160;
          const x = i * (barWidth + 4) + 30;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={180 - totalH}
                width={barWidth}
                height={totalH}
                rx={3}
                className="fill-amber-200"
              />
              <rect
                x={x}
                y={180 - feeH}
                width={barWidth}
                height={feeH}
                rx={3}
                className="fill-amber-500"
              />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={196}
                  textAnchor="middle"
                  className="fill-neutral-400 text-[8px]"
                >
                  {d.day.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 justify-end">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-200 rounded-sm inline-block" />
          Gross revenue
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-500 rounded-sm inline-block" />
          Platform fees
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const { data: trend } = useQuery({
    queryKey: ["admin-revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const totalRevenue = data
    ? data.revenue.rentalSubtotalHalalas +
      data.revenue.platformFeeHalalas +
      data.revenue.vatHalalas
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin Overview</h1>
      <p className="text-neutral-500 mb-8">
        Platform-wide metrics and moderation queues
      </p>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Users} label="Users" value={isLoading ? "..." : data?.users ?? 0} />
        <Kpi icon={Diamond} label="Listed Assets" value={isLoading ? "..." : data?.listedAssets ?? 0} />
        <Kpi icon={TrendingUp} label="Rented Now" value={isLoading ? "..." : data?.rentedAssets ?? 0} />
        <Kpi icon={Receipt} label="Rentals (MTD)" value={isLoading ? "..." : data?.rentalsThisMonth ?? 0} />
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">{isLoading ? "..." : formatSar(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Gross Rental</p>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : formatSar(data?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Platform Fees</p>
            <p className="text-2xl font-bold text-amber-600">
              {isLoading ? "..." : formatSar(data?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">VAT Collected</p>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : formatSar(data?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Revenue Trend (Last 30 Days)
          </h3>
          <RevenueChart data={trend ?? []} />
        </CardContent>
      </Card>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <Gavel className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-sm text-neutral-500">Open disputes</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : data?.openDisputes ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <FileSignature className="w-8 h-8 text-amber-500 mb-3" />
                <p className="text-sm text-neutral-500">Active Sanads</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : data?.activeSanads ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <AlertOctagon className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm text-neutral-500">Sanads under execution</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : data?.sanadsUnderExecution ?? 0}
                </p>
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
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-neutral-500 uppercase tracking-wider mb-2">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
