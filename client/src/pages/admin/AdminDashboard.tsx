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
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar } from "@/lib/api";

function actionLabel(action: string): string {
  return action.replace(/\./g, " ").replace(/_/g, " ");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const activityQuery = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => adminApi.activity(),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin overview</h1>
      <p className="text-neutral-500 mb-8">
        Platform-wide metrics and moderation queues.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          icon={Users}
          label="Users"
          value={isLoading ? "…" : data?.users ?? 0}
        />
        <Kpi
          icon={Diamond}
          label="Listed assets"
          value={isLoading ? "…" : data?.listedAssets ?? 0}
        />
        <Kpi
          icon={TrendingUp}
          label="Rented assets"
          value={isLoading ? "…" : data?.rentedAssets ?? 0}
        />
        <Kpi
          icon={Receipt}
          label="Rentals this month"
          value={isLoading ? "…" : data?.rentalsThisMonth ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">
              Gross rental revenue
            </p>
            <p className="text-3xl font-bold">
              {isLoading
                ? "…"
                : formatSar(data?.revenue.rentalSubtotalHalalas)}
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

      <h2 className="text-lg font-semibold mt-8 mb-3 flex items-center gap-2">
        <Activity className="w-5 h-5" /> Recent Activity
      </h2>
      <Card>
        <CardContent className="p-0">
          {activityQuery.isLoading ? (
            <div className="p-6 text-neutral-500 text-sm">Loading...</div>
          ) : !activityQuery.data?.length ? (
            <div className="p-6 text-neutral-500 text-sm">No recent activity.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {activityQuery.data.slice(0, 10).map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <Badge variant="secondary" className="shrink-0">
                    {a.entityType}
                  </Badge>
                  <span className="flex-1 text-neutral-700 truncate">
                    {actionLabel(a.action)}
                    {a.entityId ? ` #${a.entityId}` : ""}
                  </span>
                  {a.actorRole && (
                    <span className="text-xs text-neutral-400">{a.actorRole}</span>
                  )}
                  <span className="text-xs text-neutral-400 whitespace-nowrap">
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
