import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Trophy,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyticsApi, formatSar } from "@/lib/api";

function categoryLabel(cat: string): string {
  return {
    handbag: "Handbags",
    watch: "Watches",
    dress: "Dresses",
    jewelry: "Jewelry",
    accessory: "Accessories",
    other: "Other",
  }[cat] ?? cat;
}

function statusColor(status: string): string {
  if (["closed", "active", "confirmed"].includes(status)) return "bg-green-100 text-green-700";
  if (["cancelled", "enforcement", "in_dispute"].includes(status)) return "bg-red-100 text-red-700";
  if (status.includes("pending")) return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function Analytics() {
  const { data: growth } = useQuery({
    queryKey: ["analytics-growth"],
    queryFn: () => analyticsApi.userGrowth(),
  });

  const { data: categories } = useQuery({
    queryKey: ["analytics-categories"],
    queryFn: () => analyticsApi.categoryBreakdown(),
  });

  const { data: funnel } = useQuery({
    queryKey: ["analytics-funnel"],
    queryFn: () => analyticsApi.rentalFunnel(),
  });

  const { data: topAssets } = useQuery({
    queryKey: ["analytics-top-assets"],
    queryFn: () => analyticsApi.topAssets(),
  });

  const { data: monthly } = useQuery({
    queryKey: ["analytics-monthly"],
    queryFn: () => analyticsApi.monthlySummary(),
  });

  return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-7 h-7 text-amber-500" />
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>

        {/* Monthly Summary */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold">Monthly Revenue</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthly?.map((m) => (
              <Card key={m.month}>
                <CardContent className="p-4">
                  <p className="text-sm text-neutral-500 mb-1">{m.month}</p>
                  <p className="text-2xl font-bold">
                    {formatSar(Number(m.revenue_halalas))}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-neutral-400">
                    <span>{m.rentals} rentals</span>
                    <span>Fee: {formatSar(Number(m.platform_fee_halalas))}</span>
                    <span>VAT: {formatSar(Number(m.vat_halalas))}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!monthly || monthly.length === 0) && (
              <p className="text-neutral-400 text-sm col-span-3">No data yet</p>
            )}
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold">Asset Categories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories?.map((c) => (
              <Card key={c.category}>
                <CardContent className="p-4">
                  <p className="font-medium">{categoryLabel(c.category)}</p>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-neutral-500">
                      {c.total} total
                    </span>
                    <span className="text-green-600">{c.listed} listed</span>
                    <span className="text-amber-600">{c.rented} rented</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Avg value: {formatSar(Number(c.avg_value_halalas))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Rental Funnel */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold">Rental Status (last 30 days)</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {funnel?.map((f) => (
              <Badge key={f.status} className={statusColor(f.status)} variant="secondary">
                {f.status.replace(/_/g, " ")}: {f.count}
              </Badge>
            ))}
            {(!funnel || funnel.length === 0) && (
              <p className="text-neutral-400 text-sm">No rental data in last 30 days</p>
            )}
          </div>
        </section>

        {/* Top Assets */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold">Top Performing Assets</h2>
          </div>
          {topAssets && topAssets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Asset</th>
                    <th className="py-2 pr-4">Brand</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4 text-right">Rentals</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topAssets.map((a, i) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-neutral-400">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">{a.title}</td>
                      <td className="py-2.5 pr-4">{a.brand}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline">{categoryLabel(a.category)}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right">{a.rental_count}</td>
                      <td className="py-2.5 text-right font-medium text-amber-600">
                        {formatSar(Number(a.total_revenue_halalas))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No rental data yet</p>
          )}
        </section>

        {/* User Growth */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold">User Growth (last 90 days)</h2>
          </div>
          {growth && growth.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="flex gap-1 items-end h-32">
                {growth.map((g) => {
                  const maxNew = Math.max(...growth.map((x) => Number(x.new_users)));
                  const height = maxNew > 0 ? (Number(g.new_users) / maxNew) * 100 : 0;
                  return (
                    <div
                      key={g.day}
                      className="bg-amber-400 rounded-t min-w-[4px] flex-1"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${g.day}: ${g.new_users} new users (${g.cumulative} total)`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>{growth[0]?.day}</span>
                <span>{growth[growth.length - 1]?.day}</span>
              </div>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No growth data yet</p>
          )}
        </section>
      </div>
  );
}
