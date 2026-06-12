import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  UserX,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { adminApi, formatSar } from "@/lib/api";

const RISK_COLOR: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-700",
  ultra_high: "bg-red-200 text-red-800",
};

export default function RiskDashboard() {
  const { data: lowTrustUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["low-trust-users"],
    queryFn: () => adminApi.lowTrustUsers(),
  });

  const { data: riskDecisions, isLoading: loadingDecisions } = useQuery({
    queryKey: ["risk-decisions"],
    queryFn: () => adminApi.recentRiskDecisions(),
  });

  const approvedCount = (riskDecisions ?? []).filter((d: any) => d.approved).length;
  const rejectedCount = (riskDecisions ?? []).filter((d: any) => !d.approved).length;
  const totalDecisions = (riskDecisions ?? []).length;
  const approvalRate = totalDecisions > 0 ? Math.round((approvedCount / totalDecisions) * 100) : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="w-6 h-6 text-amber-500" />
        <h1 className="text-3xl font-bold">Risk Dashboard</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Monitor trust scores, risk assessments, and platform safety.
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Low trust users</p>
                <p className="text-2xl font-bold mt-1">{(lowTrustUsers ?? []).length}</p>
              </div>
              <UserX className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Total decisions</p>
                <p className="text-2xl font-bold mt-1">{totalDecisions}</p>
              </div>
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Approved</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Rejected</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Rate */}
      <Card className="mb-8">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Approval Rate</h2>
            <span className="text-2xl font-bold">{approvalRate}%</span>
          </div>
          <Progress value={approvalRate} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="low-trust">
        <TabsList>
          <TabsTrigger value="low-trust">Low Trust Users</TabsTrigger>
          <TabsTrigger value="decisions">Recent Decisions</TabsTrigger>
        </TabsList>

        <TabsContent value="low-trust" className="mt-4">
          {loadingUsers ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !lowTrustUsers || lowTrustUsers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                <p>No low-trust users. All clear.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {lowTrustUsers.map((user: any) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-neutral-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-neutral-500">Trust score</p>
                          <p className="font-bold text-lg">{user.trustScore}</p>
                        </div>
                        <Badge className={`${RISK_COLOR[user.riskCategory] ?? RISK_COLOR.medium} border-0`}>
                          {user.riskCategory}
                        </Badge>
                        {user.isBlocked && (
                          <Badge className="bg-red-600 text-white border-0">Blocked</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          {loadingDecisions ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !riskDecisions || riskDecisions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>No risk decisions recorded yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(riskDecisions as any[]).map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {d.approved ? (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0">
                              <XCircle className="w-3 h-3 mr-1" /> Rejected
                            </Badge>
                          )}
                          <Badge className={`${RISK_COLOR[d.riskCategory] ?? RISK_COLOR.medium} border-0`}>
                            {d.riskCategory}
                          </Badge>
                          <span className="text-xs text-neutral-400">
                            User #{d.userId}
                            {d.rentalId ? ` | Rental #${d.rentalId}` : ""}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                          <span>Score: {d.baseScore} → {d.finalScore}</span>
                          <span>Completed: {d.completedRentals}</span>
                          <span>Disputed: {d.disputedRentals}</span>
                          {d.legalCommitmentPct > 0 && (
                            <span>Commitment: {d.legalCommitmentPct}%</span>
                          )}
                        </div>
                        {d.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">{d.rejectionReason}</p>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 shrink-0">
                        {new Date(d.createdAt).toLocaleString("en-SA")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
