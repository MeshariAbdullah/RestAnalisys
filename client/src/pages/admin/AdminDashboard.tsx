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
  Shield,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar } from "@/lib/api";

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

      <h2 className="text-lg font-semibold mt-8 mb-4">Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/audit">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <Shield className="w-8 h-8 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold">Audit logs</p>
                  <p className="text-sm text-neutral-500">
                    Immutable record of all platform actions
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/overdue">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <Clock className="w-8 h-8 text-red-500 shrink-0" />
                <div>
                  <p className="font-semibold">Overdue rentals</p>
                  <p className="text-sm text-neutral-500">
                    Active rentals past return date
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/finance">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <TrendingUp className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold">Financial overview</p>
                  <p className="text-sm text-neutral-500">
                    Revenue, fees and trend charts
                  </p>
                </div>
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
