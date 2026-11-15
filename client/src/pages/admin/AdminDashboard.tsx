import React, { useState } from "react";
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
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, formatSar } from "@/lib/api";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const [showRisk, setShowRisk] = useState(false);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin overview</h1>
      <p className="text-neutral-500 mb-8">
        Platform-wide metrics and moderation queues.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi icon={Users} label="Users" value={isLoading ? "…" : data?.users ?? 0} />
        <Kpi icon={Diamond} label="Listed assets" value={isLoading ? "…" : data?.listedAssets ?? 0} />
        <Kpi icon={TrendingUp} label="Rented assets" value={isLoading ? "…" : data?.rentedAssets ?? 0} />
        <Kpi icon={Receipt} label="Rentals this month" value={isLoading ? "…" : data?.rentalsThisMonth ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Gross rental revenue</p>
            <p className="text-3xl font-bold">{isLoading ? "…" : formatSar(data?.revenue.rentalSubtotalHalalas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Platform fees</p>
            <p className="text-3xl font-bold text-amber-600">{isLoading ? "…" : formatSar(data?.revenue.platformFeeHalalas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">VAT collected</p>
            <p className="text-3xl font-bold">{isLoading ? "…" : formatSar(data?.revenue.vatHalalas)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Gavel className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-sm text-neutral-500">Open disputes</p>
                <p className="text-2xl font-bold">{isLoading ? "…" : data?.openDisputes ?? 0}</p>
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
                <p className="text-2xl font-bold">{isLoading ? "…" : data?.activeSanads ?? 0}</p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <AlertOctagon className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm text-neutral-500">Sanads under execution</p>
                <p className="text-2xl font-bold">{isLoading ? "…" : data?.sanadsUnderExecution ?? 0}</p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>

      <div className="mb-4">
        <Button
          variant={showRisk ? "default" : "outline"}
          onClick={() => setShowRisk(!showRisk)}
        >
          <ShieldAlert className="w-4 h-4 mr-2" />
          {showRisk ? "Hide Risk Monitor" : "Show Risk Monitor"}
        </Button>
      </div>

      {showRisk && <RiskMonitor />}
    </div>
  );
}

function RiskMonitor() {
  const lowTrustQuery = useQuery({
    queryKey: ["admin-low-trust"],
    queryFn: () => adminApi.lowTrustUsers(),
  });

  const riskDecisionsQuery = useQuery({
    queryKey: ["admin-risk-recent"],
    queryFn: () => adminApi.recentRiskDecisions(),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Low trust users (score &lt; 60)
          </h3>
          {lowTrustQuery.isLoading ? (
            <p className="text-neutral-500 text-sm">Loading...</p>
          ) : (lowTrustQuery.data ?? []).length === 0 ? (
            <p className="text-neutral-500 text-sm">No low-trust users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="pb-2 pr-4">ID</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Trust Score</th>
                    <th className="pb-2 pr-4">Risk</th>
                    <th className="pb-2">Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  {(lowTrustQuery.data ?? []).map(u => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{u.id}</td>
                      <td className="py-2 pr-4">{u.fullName}</td>
                      <td className="py-2 pr-4 text-neutral-500">{u.email}</td>
                      <td className="py-2 pr-4">
                        <Badge className={`border-0 ${u.trustScore < 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {u.trustScore}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{u.riskCategory}</td>
                      <td className="py-2">{u.isBlocked ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Recent risk decisions</h3>
          {riskDecisionsQuery.isLoading ? (
            <p className="text-neutral-500 text-sm">Loading...</p>
          ) : (riskDecisionsQuery.data ?? []).length === 0 ? (
            <p className="text-neutral-500 text-sm">No recent risk decisions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="pb-2 pr-4">User ID</th>
                    <th className="pb-2 pr-4">Rental ID</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2 pr-4">Risk</th>
                    <th className="pb-2 pr-4">Approved</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(riskDecisionsQuery.data ?? []).slice(0, 20).map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{String(d.userId ?? "-")}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{String(d.rentalId ?? "-")}</td>
                      <td className="py-2 pr-4">{String(d.finalScore ?? "-")}</td>
                      <td className="py-2 pr-4">
                        <Badge className={`border-0 text-xs ${
                          d.riskCategory === "high" || d.riskCategory === "ultra_high"
                            ? "bg-red-100 text-red-700"
                            : d.riskCategory === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}>
                          {String(d.riskCategory ?? "-")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{d.approved ? "Yes" : "No"}</td>
                      <td className="py-2 text-neutral-500 text-xs">
                        {d.createdAt ? new Date(String(d.createdAt)).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
