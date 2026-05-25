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
  ClipboardCheck,
  Upload,
  ScrollText,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, assetsApi, formatSar } from "@/lib/api";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const pendingQuery = useQuery({
    queryKey: ["assets-pending"],
    queryFn: () => assetsApi.pending(),
  });

  const readyQuery = useQuery({
    queryKey: ["assets-ready-to-publish"],
    queryFn: () => assetsApi.readyToPublish(),
  });

  const pendingCount = pendingQuery.data?.length ?? 0;
  const readyCount = readyQuery.data?.length ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin overview</h1>
      <p className="text-neutral-500 mb-8">
        Platform-wide metrics and moderation queues.
      </p>

      {/* Action items */}
      {(pendingCount > 0 || readyCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-8">
          {pendingCount > 0 && (
            <Link href="/admin/approvals">
              <a className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 hover:bg-amber-100 transition-colors cursor-pointer">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    {pendingCount} asset{pendingCount !== 1 ? "s" : ""} awaiting review
                  </p>
                  <p className="text-xs text-amber-700">Click to review</p>
                </div>
              </a>
            </Link>
          )}
          {readyCount > 0 && (
            <Link href="/admin/approvals">
              <a className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 hover:bg-green-100 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">
                    {readyCount} asset{readyCount !== 1 ? "s" : ""} ready to publish
                  </p>
                  <p className="text-xs text-green-700">Click to publish</p>
                </div>
              </a>
            </Link>
          )}
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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

      <h2 className="text-lg font-semibold mb-4">Quick navigation</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink href="/admin/approvals" icon={ClipboardCheck} label="Asset Approvals" />
        <QuickLink href="/admin/users" icon={Users} label="User Management" />
        <QuickLink href="/admin/finance" icon={Receipt} label="Financial Overview" />
        <QuickLink href="/admin/analytics" icon={BarChart3} label="Analytics" />
        <QuickLink href="/admin/disputes" icon={Gavel} label="Disputes" />
        <QuickLink href="/admin/sanad" icon={FileSignature} label="Sanad Tracking" />
        <QuickLink href="/admin/audit" icon={ScrollText} label="Audit Logs" />
        <QuickLink href="/notifications" icon={Receipt} label="Notifications" />
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

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link href={href}>
      <a className="flex items-center gap-3 border rounded-xl p-4 hover:bg-neutral-50 hover:shadow-sm transition-all cursor-pointer">
        <Icon className="w-5 h-5 text-amber-500 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </a>
    </Link>
  );
}
