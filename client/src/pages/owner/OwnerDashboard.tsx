import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Diamond,
  Plus,
  TrendingUp,
  Package,
  Wallet,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statsApi, assetsApi, formatSar, type Asset } from "@/lib/api";
import { getAssetStatusLabel } from "@/lib/utils";

function statusColor(s: string): string {
  if (s === "listed" || s === "rented_out") return "bg-green-100 text-green-700";
  if (s.startsWith("pending")) return "bg-amber-100 text-amber-800";
  if (s === "rejected" || s === "withdrawn") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function OwnerDashboard() {
  const statsQuery = useQuery({
    queryKey: ["owner-stats"],
    queryFn: () => statsApi.owner(),
  });

  const assetsQuery = useQuery({
    queryKey: ["assets-mine"],
    queryFn: () => assetsApi.mine(),
  });

  const stats = statsQuery.data;
  const assets = assetsQuery.data ?? [];

  const activeCount = stats?.listedAssets ?? 0;
  const totalAssets = stats?.totalAssets ?? assets.length;
  const totalEarnings = stats?.earnings.totalNetHalalas ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Owner dashboard</h1>
          <p className="text-neutral-500 mt-1">
            Your assets under management with MLR
          </p>
        </div>
        <Link href="/owner/submit">
          <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
            <Plus className="w-4 h-4 mr-1.5" />
            Submit new asset
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Diamond className="w-4 h-4" />
              Active assets
            </div>
            <p className="text-3xl font-bold">{activeCount}</p>
            <p className="text-xs text-neutral-500 mt-1">
              of {totalAssets} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <BarChart3 className="w-4 h-4" />
              Rented out
            </div>
            <p className="text-3xl font-bold">{stats?.rentedAssets ?? 0}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {stats?.rentals.active ?? 0} active rentals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <TrendingUp className="w-4 h-4" />
              Net earnings
            </div>
            <p className="text-3xl font-bold">{formatSar(totalEarnings)}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {stats?.earnings.totalCommissionHalalas
                ? `${formatSar(stats.earnings.totalCommissionHalalas)} commission`
                : "After platform fees"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Wallet className="w-4 h-4" />
              Pending payouts
            </div>
            <p className="text-3xl font-bold">{stats?.pendingPayouts ?? 0}</p>
            <Link href="/owner/payouts">
              <a className="text-xs text-amber-600 hover:underline mt-1 inline-block">
                View payout history →
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>

      {stats?.assetsByStatus && stats.assetsByStatus.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3">Assets by status</h3>
            <div className="flex flex-wrap gap-2">
              {stats.assetsByStatus.map((s) => (
                <Badge
                  key={s.status}
                  variant="outline"
                  className="text-sm py-1 px-3"
                >
                  {getAssetStatusLabel(s.status)}{" "}
                  <span className="font-bold ml-1">{s.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.recentRentals && stats.recentRentals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Recent rentals</h2>
          <div className="space-y-3">
            {stats.recentRentals.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-neutral-500">
                      {r.reference}
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {r.startDate} → {r.endDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-semibold text-sm">
                      {formatSar(r.totalPayableHalalas)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">My assets</h2>
      {assetsQuery.isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't submitted any assets yet.</p>
            <Link href="/owner/submit">
              <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Submit your first asset →
              </a>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((asset: Asset) => (
            <Link key={asset.id} href={`/owner/assets/${asset.id}`}>
              <a>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="aspect-video bg-neutral-100 relative flex items-center justify-center">
                    {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                      <img
                        src={
                          asset.studioImagesJson[0] ||
                          asset.submissionImagesJson[0]
                        }
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Diamond className="w-12 h-12 text-neutral-300" />
                    )}
                    <Badge
                      className={`absolute top-3 right-3 border-0 ${statusColor(
                        asset.status
                      )}`}
                    >
                      {getAssetStatusLabel(asset.status)}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                      {asset.brand}
                    </p>
                    <p className="font-semibold mt-0.5 line-clamp-1">
                      {asset.title}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Daily</span>
                      <span className="font-semibold text-amber-600">
                        {formatSar(asset.dailyRentalPriceHalalas)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Evaluated</span>
                      <span>{formatSar(asset.evaluatedValueHalalas)}</span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
