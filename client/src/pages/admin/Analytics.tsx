import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Diamond,
  TrendingUp,
  Users,
  PieChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar } from "@/lib/api";

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    handbag: "Handbags",
    watch: "Watches",
    dress: "Dresses",
    jewelry: "Jewelry",
    accessory: "Accessories",
    other: "Other",
  };
  return labels[cat] ?? cat;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    renter: "Renters",
    owner: "Owners",
    inspector: "Inspectors",
    operations: "Operations",
    admin: "Admins",
    super_admin: "Super Admins",
  };
  return labels[role] ?? role;
}

const BAR_COLORS = [
  "bg-amber-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-orange-500",
];

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => adminApi.analytics(),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const assetsByCategory = data?.assetsByCategory ?? [];
  const rentalsByStatus = data?.rentalsByStatus ?? [];
  const topBrands = data?.topBrands ?? [];
  const usersByRole = data?.usersByRole ?? [];
  const monthlyRevenue = data?.monthlyRevenue ?? [];

  const maxCat = Math.max(...assetsByCategory.map((c) => Number(c.count)), 1);
  const maxRental = Math.max(...rentalsByStatus.map((r) => Number(r.count)), 1);
  const maxBrand = Math.max(...topBrands.map((b) => Number(b.count)), 1);
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => Number(m.total_halalas)), 1);
  const totalUsers = usersByRole.reduce((sum, r) => sum + Number(r.count), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-6 h-6" />
          Platform Analytics
        </h1>
        <p className="text-neutral-500 mt-1">
          Breakdown of assets, rentals, revenue, and users.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Diamond className="w-4 h-4" />
              Assets by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetsByCategory.length === 0 ? (
              <p className="text-sm text-neutral-400">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {assetsByCategory.map((cat, i) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{categoryLabel(cat.category)}</span>
                      <span className="text-neutral-500">{cat.count}</span>
                    </div>
                    <div className="h-5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${(Number(cat.count) / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rentals by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Rentals by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rentalsByStatus.length === 0 ? (
              <p className="text-sm text-neutral-400">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {rentalsByStatus.map((rental, i) => (
                  <div key={rental.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{statusLabel(rental.status)}</span>
                      <span className="text-neutral-500">{rental.count}</span>
                    </div>
                    <div className="h-5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${(Number(rental.count) / maxRental) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Brands */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Diamond className="w-4 h-4" />
              Top Brands
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBrands.length === 0 ? (
              <p className="text-sm text-neutral-400">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topBrands.map((brand, i) => (
                  <div key={brand.brand} className="flex items-center gap-3">
                    <span className="w-6 text-xs text-neutral-400 text-right">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{brand.brand}</span>
                        <div className="flex items-center gap-3 text-neutral-500">
                          <span>{brand.count} assets</span>
                          <span className="text-xs">{formatSar(Number(brand.total_value_halalas))}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{ width: `${(Number(brand.count) / maxBrand) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users by Role
              <Badge variant="secondary" className="ml-auto">{totalUsers} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersByRole.length === 0 ? (
              <p className="text-sm text-neutral-400">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {usersByRole.map((role, i) => {
                  const pct = totalUsers > 0 ? ((Number(role.count) / totalUsers) * 100).toFixed(1) : "0";
                  return (
                    <div key={role.role} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                      <span className="text-sm font-medium flex-1">{roleLabel(role.role)}</span>
                      <span className="text-sm text-neutral-500">{role.count}</span>
                      <span className="text-xs text-neutral-400 w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Revenue (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length === 0 ? (
            <p className="text-sm text-neutral-400">No revenue data yet.</p>
          ) : (
            <div className="space-y-2">
              {monthlyRevenue.map((m) => {
                const totalPct = (Number(m.total_halalas) / maxRevenue) * 100;
                const feePct = (Number(m.fee_halalas) / maxRevenue) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-neutral-500 shrink-0 font-mono">{m.month}</span>
                    <div className="flex-1 h-6 bg-neutral-100 rounded relative overflow-hidden">
                      <div
                        className="absolute h-full bg-neutral-200 rounded"
                        style={{ width: `${totalPct}%` }}
                      />
                      <div
                        className="absolute h-full bg-amber-500 rounded"
                        style={{ width: `${feePct}%` }}
                      />
                    </div>
                    <span className="w-28 text-right font-mono text-xs">
                      {formatSar(Number(m.total_halalas))}
                    </span>
                    <span className="w-20 text-right text-xs text-amber-600">
                      fee: {formatSar(Number(m.fee_halalas))}
                    </span>
                    <span className="w-16 text-right text-xs text-neutral-400">
                      {m.rentals} deals
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
