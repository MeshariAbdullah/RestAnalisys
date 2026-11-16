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
  UserPlus,
  ShieldAlert,
  Package,
  Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { adminApi, formatSar, type AdminKPIs } from "@/lib/api";

const ASSET_STATUS_LABELS: Record<string, string> = {
  pending_approval: "Pending approval",
  rejected: "Rejected",
  awaiting_shipment: "Awaiting shipment",
  in_inspection: "In inspection",
  inspection_reported: "Inspection reported",
  owner_rejected_valuation: "Valuation rejected",
  ready_for_listing: "Ready to list",
  listed: "Listed",
  reserved: "Reserved",
  rented_out: "Rented out",
  returned_under_inspection: "Return inspection",
  completed: "Completed",
  withdrawn: "Withdrawn",
  lost_or_destroyed: "Lost/destroyed",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  ultra_high: "bg-red-600",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  rental_fee: "Rental fees",
  platform_fee: "Platform fees",
  vat: "VAT",
  penalty: "Penalties",
  compensation: "Compensation",
  owner_payout: "Owner payouts",
  refund: "Refunds",
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin overview</h1>
      <p className="text-neutral-500 mb-8">
        Platform-wide metrics and moderation queues.
      </p>

      {/* ── Row 1: Core KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Kpi icon={Users} label="Total users" value={isLoading ? "…" : data?.users ?? 0} />
        <Kpi icon={Diamond} label="Listed assets" value={isLoading ? "…" : data?.listedAssets ?? 0} />
        <Kpi icon={TrendingUp} label="Active rentals" value={isLoading ? "…" : data?.activeRentals ?? 0} />
        <Kpi icon={Receipt} label="Rentals this month" value={isLoading ? "…" : data?.rentalsThisMonth ?? 0} />
        <Kpi icon={UserPlus} label="New users (30d)" value={isLoading ? "…" : data?.newUsersLast30Days ?? 0} />
      </div>

      {/* ── Row 2: Revenue ───────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold mb-3">Revenue</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Total captured</p>
            <p className="text-3xl font-bold">
              {isLoading ? "…" : formatSar(data?.totalCapturedHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Gross rental revenue</p>
            <p className="text-3xl font-bold">
              {isLoading ? "…" : formatSar(data?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Platform fees</p>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? "…" : formatSar(data?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">VAT collected</p>
            <p className="text-3xl font-bold">
              {isLoading ? "…" : formatSar(data?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Payment breakdown ─────────────────────────────────── */}
      {data?.paymentBreakdown && Object.keys(data.paymentBreakdown).length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Payment breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(data.paymentBreakdown).map(([type, info]) => (
              <Card key={type}>
                <CardContent className="p-4">
                  <p className="text-xs text-neutral-500 mb-1">
                    {PAYMENT_TYPE_LABELS[type] ?? type}
                  </p>
                  <p className="text-xl font-bold">{formatSar(info.totalHalalas)}</p>
                  <p className="text-xs text-neutral-400">{info.count} transactions</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Row 4: Asset pipeline + Risk distribution ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" /> Asset pipeline
          </h2>
          <Card>
            <CardContent className="p-5 space-y-3">
              {isLoading ? (
                <p className="text-neutral-400">Loading…</p>
              ) : data?.assetPipeline && Object.keys(data.assetPipeline).length > 0 ? (
                Object.entries(data.assetPipeline)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const total = Object.values(data.assetPipeline).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{ASSET_STATUS_LABELS[status] ?? status}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })
              ) : (
                <p className="text-neutral-400">No assets yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> User risk distribution
          </h2>
          <Card>
            <CardContent className="p-5 space-y-3">
              {isLoading ? (
                <p className="text-neutral-400">Loading…</p>
              ) : data?.riskDistribution && Object.keys(data.riskDistribution).length > 0 ? (
                ["low", "medium", "high", "ultra_high"]
                  .filter((cat) => (data.riskDistribution[cat] ?? 0) > 0)
                  .map((cat) => {
                    const count = data.riskDistribution[cat] ?? 0;
                    const total = Object.values(data.riskDistribution).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${RISK_COLORS[cat]}`} />
                            {cat.replace("_", " ")}
                          </span>
                          <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })
              ) : (
                <p className="text-neutral-400">No users yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 5: Moderation queues ─────────────────────────────────── */}
      <h2 className="text-lg font-semibold mb-3">Moderation queues</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Gavel className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-sm text-neutral-500">Open disputes</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.openDisputes ?? 0}
                </p>
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
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.activeSanads ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <AlertOctagon className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm text-neutral-500">
                  Sanads under execution
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.sanadsUnderExecution ?? 0}
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
