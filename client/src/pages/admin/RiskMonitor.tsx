import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  UserX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar, type User } from "@/lib/api";
import { formatDate, getScoreBg, formatScore } from "@/lib/utils";

function riskBadge(category: string) {
  switch (category) {
    case "low": return "bg-green-100 text-green-800";
    case "medium": return "bg-yellow-100 text-yellow-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "ultra_high": return "bg-red-100 text-red-800";
    default: return "bg-neutral-200 text-neutral-700";
  }
}

export default function RiskMonitor() {
  const lowTrust = useQuery({
    queryKey: ["admin-low-trust"],
    queryFn: () => adminApi.lowTrustUsers(),
  });

  const recentRisk = useQuery({
    queryKey: ["admin-recent-risk"],
    queryFn: () => adminApi.recentRiskDecisions(),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="w-7 h-7 text-red-500" />
        <h1 className="text-3xl font-bold">Risk Monitor</h1>
      </div>
      <p className="text-neutral-500 mb-8">
        Low-trust users and recent risk engine decisions.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low-trust users */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserX className="w-5 h-5 text-orange-500" />
            Low-trust users
            {lowTrust.data && (
              <Badge className="bg-orange-100 text-orange-800 ml-2">
                {lowTrust.data.length}
              </Badge>
            )}
          </h2>

          {lowTrust.isLoading ? (
            <p className="text-neutral-500 text-sm">Loading…</p>
          ) : !lowTrust.data || lowTrust.data.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-neutral-500 text-sm">
                No low-trust users. All clear.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {lowTrust.data.map((u: User) => (
                <Card key={u.id} className="hover:shadow transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-bold text-neutral-500">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.fullName}</p>
                      <p className="text-xs text-neutral-500">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getScoreBg(u.trustScore)} px-2 py-0.5 rounded text-xs`}>
                        {formatScore(u.trustScore)}
                      </p>
                      <Badge className={`mt-1 ${riskBadge(u.riskCategory)}`}>
                        {u.riskCategory.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {u.isBlocked && (
                        <Badge className="bg-red-100 text-red-800 text-[10px]">Blocked</Badge>
                      )}
                      {!u.nafathVerified && (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">Unverified</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent risk decisions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-500" />
            Recent risk decisions
          </h2>

          {recentRisk.isLoading ? (
            <p className="text-neutral-500 text-sm">Loading…</p>
          ) : !recentRisk.data || recentRisk.data.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-neutral-500 text-sm">
                No recent risk decisions recorded.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentRisk.data.map((d: Record<string, unknown>, i: number) => (
                <Card key={i} className="hover:shadow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">
                        {(d.action as string) ?? "risk_evaluation"}
                      </p>
                      {d.createdAt && (
                        <span className="text-xs text-neutral-400">
                          {formatDate(d.createdAt as string)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {d.entityType && (
                        <Badge className="bg-neutral-100 text-neutral-700 text-xs">
                          {d.entityType as string} #{d.entityId as number}
                        </Badge>
                      )}
                      {d.after && typeof d.after === "object" && (d.after as Record<string, unknown>).riskCategory && (
                        <Badge className={riskBadge((d.after as Record<string, unknown>).riskCategory as string)}>
                          {((d.after as Record<string, unknown>).riskCategory as string).replace("_", " ")}
                        </Badge>
                      )}
                      {d.after && typeof d.after === "object" && (d.after as Record<string, unknown>).commitmentPct && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {(d.after as Record<string, unknown>).commitmentPct as number}% commitment
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
