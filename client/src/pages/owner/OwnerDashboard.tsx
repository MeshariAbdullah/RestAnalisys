import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Diamond, Plus, TrendingUp, Package, Wallet, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, paymentsApi, dashboardApi, formatSar, type Asset } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "listed" || s === "rented_out") return "bg-green-100 text-green-700";
  if (s.startsWith("pending") || s === "inspection_reported") return "bg-amber-100 text-amber-800";
  if (s === "rejected" || s === "withdrawn") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function OwnerDashboard() {
  const assetsQuery = useQuery({
    queryKey: ["assets-mine"],
    queryFn: () => assetsApi.mine(),
  });

  const statsQuery = useQuery({
    queryKey: ["owner-stats"],
    queryFn: () => dashboardApi.ownerStats(),
  });

  const assets = assetsQuery.data ?? [];
  const stats = statsQuery.data;

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
              Listed assets
            </div>
            <p className="text-3xl font-bold">{stats?.assets.listed ?? 0}</p>
            <p className="text-xs text-neutral-500 mt-1">
              of {stats?.assets.total ?? assets.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Activity className="w-4 h-4" />
              Currently rented
            </div>
            <p className="text-3xl font-bold">{stats?.assets.rented ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <TrendingUp className="w-4 h-4" />
              Active rentals
            </div>
            <p className="text-3xl font-bold">{stats?.rentals.active ?? 0}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {stats?.rentals.total ?? 0} lifetime
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Wallet className="w-4 h-4" />
              Total earned
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(stats?.rentals.totalEarnedHalalas ?? 0)}
            </p>
            <Link href="/owner/payouts">
              <a className="text-xs text-amber-600 hover:underline mt-1 inline-block">
                View payout history
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent rental activity */}
      {(stats?.recentRentals ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Recent rental activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {(stats?.recentRentals ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-medium">{r.assetTitle}</p>
                      <p className="text-xs text-neutral-500">{r.reference} &middot; {r.startDate} to {r.endDate}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColor(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                      <p className="text-xs text-neutral-500 mt-1">{formatSar(r.totalPayableHalalas)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">My assets</h2>
      {assetsQuery.isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't submitted any assets yet.</p>
            <Link href="/owner/submit">
              <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Submit your first asset
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
                          (asset.studioImagesJson as string[])[0] ||
                          (asset.submissionImagesJson as string[])[0]
                        }
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Diamond className="w-12 h-12 text-neutral-300" />
                    )}
                    <Badge
                      className={`absolute top-3 right-3 border-0 ${statusColor(asset.status)}`}
                    >
                      {asset.status.replace(/_/g, " ")}
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
