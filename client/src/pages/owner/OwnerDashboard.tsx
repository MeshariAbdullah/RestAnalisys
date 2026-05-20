import React, { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Diamond,
  Plus,
  TrendingUp,
  Package,
  Wallet,
  ArrowRight,
  Clock,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, paymentsApi, formatSar, type Asset } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "listed") return "bg-emerald-100 text-emerald-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s === "awaiting_owner_approval") return "bg-amber-100 text-amber-800";
  if (s.startsWith("pending")) return "bg-yellow-100 text-yellow-800";
  if (s === "rejected") return "bg-red-100 text-red-700";
  if (s === "withdrawn") return "bg-neutral-200 text-neutral-600";
  return "bg-neutral-200 text-neutral-700";
}

function statusBorderColor(s: string): string {
  if (s === "listed") return "border-l-emerald-400";
  if (s === "rented_out") return "border-l-blue-400";
  if (s === "awaiting_owner_approval") return "border-l-amber-400";
  if (s.startsWith("pending")) return "border-l-yellow-400";
  if (s === "rejected") return "border-l-red-400";
  if (s === "withdrawn") return "border-l-neutral-400";
  return "border-l-neutral-300";
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; colorClass: string }> = {
  pending_approval: { label: "Pending approval", icon: <Clock className="w-4 h-4" />, colorClass: "text-yellow-600 bg-yellow-50" },
  awaiting_owner_approval: { label: "Awaiting your approval", icon: <Clock className="w-4 h-4" />, colorClass: "text-amber-600 bg-amber-50" },
  listed: { label: "Listed", icon: <CheckCircle2 className="w-4 h-4" />, colorClass: "text-emerald-600 bg-emerald-50" },
  rented_out: { label: "Rented out", icon: <ShieldCheck className="w-4 h-4" />, colorClass: "text-blue-600 bg-blue-50" },
  rejected: { label: "Rejected", icon: <XCircle className="w-4 h-4" />, colorClass: "text-red-600 bg-red-50" },
  withdrawn: { label: "Withdrawn", icon: <XCircle className="w-4 h-4" />, colorClass: "text-neutral-500 bg-neutral-100" },
};

export default function OwnerDashboard() {
  const assetsQuery = useQuery({
    queryKey: ["assets-mine"],
    queryFn: () => assetsApi.mine(),
  });

  const payoutsQuery = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => paymentsApi.myPayouts(),
  });

  const assets = assetsQuery.data ?? [];
  const totalValue = assets.reduce(
    (sum, a) => sum + (a.evaluatedValueHalalas ?? 0),
    0
  );
  const activeCount = assets.filter(
    (a) => a.status === "listed" || a.status === "rented_out"
  ).length;
  const totalPayouts = (payoutsQuery.data ?? []).reduce(
    (sum, p) => sum + Number(p.netHalalas ?? 0),
    0
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assets) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [assets]);

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

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Diamond className="w-4 h-4" />
              Active assets
            </div>
            <p className="text-3xl font-bold">{activeCount}</p>
            <p className="text-xs text-neutral-500 mt-1">
              of {assets.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <TrendingUp className="w-4 h-4" />
              Portfolio value
            </div>
            <p className="text-3xl font-bold">{formatSar(totalValue)}</p>
            <p className="text-xs text-neutral-500 mt-1">Sum of evaluations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Wallet className="w-4 h-4" />
              Lifetime payouts
            </div>
            <p className="text-3xl font-bold">{formatSar(totalPayouts)}</p>
            <Link href="/owner/payouts">
              <a className="text-xs text-amber-600 hover:underline mt-1 inline-block">
                View payout history →
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      {assets.length > 0 && Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => {
            const meta = STATUS_META[status];
            const colorClass = meta?.colorClass ?? "text-neutral-600 bg-neutral-100";
            return (
              <div
                key={status}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colorClass}`}
              >
                {meta?.icon}
                <span>{meta?.label ?? status.replace(/_/g, " ")}</span>
                <span className="ml-1 font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Link href="/owner/submit">
          <a className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-amber-300 bg-amber-50/30">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Submit new asset</p>
                    <p className="text-xs text-neutral-500">
                      Add a luxury item for rental
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/owner/payouts">
          <a className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-emerald-300 bg-emerald-50/30">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">View payouts</p>
                    <p className="text-xs text-neutral-500">
                      Track earnings and payout history
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>

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
                <Card
                  className={`hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 ${statusBorderColor(
                    asset.status
                  )}`}
                >
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
