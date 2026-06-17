import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  UserX,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar, type User } from "@/lib/api";

function riskColor(category: string): string {
  if (category === "low") return "bg-green-100 text-green-700";
  if (category === "medium") return "bg-amber-100 text-amber-700";
  if (category === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function scoreBar(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export default function RiskMonitor() {
  const { data: lowTrust, isLoading: loadingUsers } = useQuery({
    queryKey: ["risk-low-trust"],
    queryFn: () => adminApi.lowTrustUsers(),
  });

  const { data: recentDecisions, isLoading: loadingDecisions } = useQuery({
    queryKey: ["risk-recent-decisions"],
    queryFn: () => adminApi.recentRiskDecisions(),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="w-8 h-8 text-red-500" />
        <h1 className="text-3xl font-bold">Risk Monitor</h1>
      </div>
      <p className="text-neutral-500 mb-8">
        Track high-risk users and recent risk engine decisions.
      </p>

      {/* Low Trust Users */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <UserX className="w-5 h-5 text-orange-500" />
        Low Trust Users
      </h2>
      {loadingUsers ? (
        <p className="text-neutral-500 mb-8">Loading...</p>
      ) : !lowTrust || lowTrust.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="p-8 text-center text-neutral-500">
            No low-trust users found. All users are in good standing.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {lowTrust.map((user: User) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0">
                    <UserX className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{user.fullName}</p>
                      <Badge className={`border-0 ${riskColor(user.riskCategory)}`}>
                        {user.riskCategory}
                      </Badge>
                      {user.isBlocked && (
                        <Badge className="bg-red-500 text-white border-0">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">{user.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(user.trustScore)}`}
                          style={{ width: `${user.trustScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono font-bold w-8 text-right">
                        {user.trustScore}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-neutral-400">
                      <span>{user.role}</span>
                      <span>
                        Nafath: {user.nafathVerified ? "Verified" : "Unverified"}
                      </span>
                      <span>KYC: {user.kycStatus}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Risk Decisions */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-500" />
        Recent Risk Decisions
      </h2>
      {loadingDecisions ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !recentDecisions || recentDecisions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            No recent risk decisions.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Decision</th>
                <th className="pb-3 font-medium">Commitment</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentDecisions.map((d: Record<string, unknown>, i: number) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-3">User #{String(d.userId)}</td>
                  <td className="py-3">
                    <span className="font-mono font-bold">
                      {String(d.finalScore)}
                    </span>
                  </td>
                  <td className="py-3">
                    <Badge
                      className={`border-0 ${riskColor(String(d.riskCategory))}`}
                    >
                      {String(d.riskCategory)}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {d.approved ? (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        Approved
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-0">
                        Rejected
                      </Badge>
                    )}
                  </td>
                  <td className="py-3">
                    {d.legalCommitmentPct
                      ? `${d.legalCommitmentPct}% (${formatSar(Number(d.legalCommitmentHalalas))})`
                      : "—"}
                  </td>
                  <td className="py-3 text-neutral-400">
                    {d.createdAt
                      ? new Date(String(d.createdAt)).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
