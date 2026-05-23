import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { adminApi } from "@/lib/api";

interface SystemStatsData {
  users: { total: number; byRole: Array<{ role: string; count: number }> };
  assets: { total: number; byStatus: Array<{ status: string; count: number }> };
  rentals: { total: number; byStatus: Array<{ status: string; count: number }> };
  disputes: { total: number };
}

function statusColor(status: string): string {
  if (["listed", "active", "closed", "verified"].includes(status)) return "bg-green-100 text-green-800";
  if (["pending_approval", "pending_risk_review", "pending_payment", "open"].includes(status)) return "bg-amber-100 text-amber-800";
  if (["rejected", "cancelled", "lost_or_destroyed", "enforcement"].includes(status)) return "bg-red-100 text-red-800";
  return "bg-neutral-100 text-neutral-800";
}

export default function SystemStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["system-stats"],
    queryFn: () => adminApi.systemStats(),
  });

  const stats = data as SystemStatsData | undefined;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">System Statistics</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats) return null;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">System Statistics</h1>
        <p className="text-neutral-500 mb-6">Real-time platform health overview.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold">{stats.users.total}</p>
              <p className="text-sm text-neutral-500 mt-1">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold">{stats.assets.total}</p>
              <p className="text-sm text-neutral-500 mt-1">Total Assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold">{stats.rentals.total}</p>
              <p className="text-sm text-neutral-500 mt-1">Total Rentals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold">{stats.disputes.total}</p>
              <p className="text-sm text-neutral-500 mt-1">Total Disputes</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.users.byRole.map((r) => (
                  <div key={r.role} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{r.role.replace("_", " ")}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(Number(r.count) / stats.users.total) * 100} className="w-24 h-2" />
                      <span className="text-sm font-medium w-8 text-right">{Number(r.count)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assets by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.assets.byStatus.map((s) => (
                  <Badge key={s.status} className={statusColor(s.status)}>
                    {s.status.replace(/_/g, " ")} ({Number(s.count)})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Rentals by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.rentals.byStatus.map((s) => (
                  <Badge key={s.status} className={statusColor(s.status)}>
                    {s.status.replace(/_/g, " ")} ({Number(s.count)})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
