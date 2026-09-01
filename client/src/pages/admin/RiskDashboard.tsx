import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  Users as UsersIcon,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { adminApi, type User } from "@/lib/api";
import { formatScore, getScoreColor, getScoreBg, formatDate } from "@/lib/utils";

function riskBadgeClass(level: string): string {
  switch (level) {
    case "low":
      return "bg-green-100 text-green-700 border-0";
    case "medium":
      return "bg-amber-100 text-amber-800 border-0";
    case "high":
      return "bg-red-100 text-red-700 border-0";
    case "ultra_high":
      return "bg-red-200 text-red-900 border-0";
    default:
      return "bg-neutral-100 text-neutral-700 border-0";
  }
}

function decisionIcon(decision: string) {
  switch (decision) {
    case "approved":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "manual_review":
      return <Eye className="w-4 h-4 text-amber-600" />;
    default:
      return <Activity className="w-4 h-4 text-neutral-400" />;
  }
}

function decisionBadgeClass(decision: string): string {
  switch (decision) {
    case "approved":
      return "bg-green-100 text-green-700 border-0";
    case "rejected":
      return "bg-red-100 text-red-700 border-0";
    case "manual_review":
      return "bg-amber-100 text-amber-800 border-0";
    default:
      return "bg-neutral-100 text-neutral-700 border-0";
  }
}

export default function RiskDashboard() {
  const {
    data: lowTrustUsers,
    isLoading: loadingUsers,
  } = useQuery({
    queryKey: ["admin-low-trust-users"],
    queryFn: () => adminApi.lowTrustUsers(),
  });

  const {
    data: riskDecisions,
    isLoading: loadingDecisions,
  } = useQuery({
    queryKey: ["admin-recent-risk-decisions"],
    queryFn: () => adminApi.recentRiskDecisions(),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold">Risk Monitor</h1>
      </div>
      <p className="text-neutral-500 mb-8">
        Low-trust accounts and recent risk assessment decisions.
      </p>

      <Tabs defaultValue="low-trust">
        <TabsList>
          <TabsTrigger value="low-trust">Low Trust Users</TabsTrigger>
          <TabsTrigger value="decisions">Recent Risk Decisions</TabsTrigger>
        </TabsList>

        {/* ── Low Trust Users ── */}
        <TabsContent value="low-trust">
          {loadingUsers ? (
            <p className="text-neutral-500 mt-6">Loading...</p>
          ) : !lowTrustUsers || lowTrustUsers.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="p-12 text-center text-neutral-500">
                <UsersIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                No low-trust users found.
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-neutral-50 text-left">
                      <tr>
                        <th className="p-4 font-medium">Name</th>
                        <th className="p-4 font-medium">Email</th>
                        <th className="p-4 font-medium">Role</th>
                        <th className="p-4 font-medium">Trust Score</th>
                        <th className="p-4 font-medium">Risk Category</th>
                        <th className="p-4 font-medium">Nafath</th>
                        <th className="p-4 font-medium">Account Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowTrustUsers.map((u: User) => {
                        const createdAt = (u as unknown as Record<string, string>).createdAt;
                        const accountAge = createdAt
                          ? `${Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))}d`
                          : "—";

                        return (
                          <tr key={u.id} className="border-b last:border-0">
                            <td className="p-4 font-medium">{u.fullName}</td>
                            <td className="p-4 text-neutral-600">{u.email}</td>
                            <td className="p-4">
                              <Badge variant="outline">{u.role}</Badge>
                            </td>
                            <td className="p-4">
                              <span
                                className={`font-mono font-semibold ${getScoreColor(u.trustScore)}`}
                              >
                                {formatScore(u.trustScore)}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge className={riskBadgeClass(u.riskCategory)}>
                                {u.riskCategory.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {u.nafathVerified ? (
                                <Badge className="bg-green-100 text-green-700 border-0">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-neutral-200 text-neutral-600 border-0">
                                  Unverified
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-neutral-600 font-mono text-xs">
                              {accountAge}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Recent Risk Decisions ── */}
        <TabsContent value="decisions">
          {loadingDecisions ? (
            <p className="text-neutral-500 mt-6">Loading...</p>
          ) : !riskDecisions || riskDecisions.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="p-12 text-center text-neutral-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                No recent risk decisions.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 mt-4">
              {riskDecisions.map((d: Record<string, unknown>, i: number) => {
                const decision = (d.decision as string) ?? "unknown";
                const score = d.score as number | undefined;
                const riskLevel = (d.riskLevel as string) ?? (d.risk_level as string) ?? "unknown";
                const commitmentPct = d.commitmentPct as number | undefined ?? d.commitment_pct as number | undefined;
                const timestamp = (d.createdAt as string) ?? (d.created_at as string) ?? (d.timestamp as string);
                const userName = (d.userName as string) ?? (d.user_name as string);
                const userEmail = (d.userEmail as string) ?? (d.user_email as string);

                return (
                  <Card key={d.id as number ?? i}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          {decisionIcon(decision)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={decisionBadgeClass(decision)}>
                              {decision.replace(/_/g, " ")}
                            </Badge>
                            <Badge className={riskBadgeClass(riskLevel)}>
                              {riskLevel.replace(/_/g, " ")}
                            </Badge>
                            {score !== undefined && score !== null && (
                              <span
                                className={`text-sm font-mono font-semibold ${getScoreColor(score)}`}
                              >
                                {formatScore(score)}
                              </span>
                            )}
                            {commitmentPct !== undefined && commitmentPct !== null && (
                              <span className="text-xs text-neutral-500">
                                Commitment: {commitmentPct}%
                              </span>
                            )}
                          </div>
                          {(userName || userEmail) && (
                            <p className="text-sm text-neutral-600 mt-1">
                              {userName}{userName && userEmail ? " · " : ""}{userEmail}
                            </p>
                          )}
                          {timestamp && (
                            <p className="text-xs text-neutral-400 mt-1">
                              {formatDate(timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
