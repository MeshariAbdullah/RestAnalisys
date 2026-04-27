import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { operationsApi } from "@/lib/api";

function severityColor(s: string): string {
  if (s === "critical") return "bg-red-600 text-white";
  if (s === "high") return "bg-red-100 text-red-700";
  if (s === "medium") return "bg-amber-100 text-amber-800";
  return "bg-neutral-200 text-neutral-700";
}

function typeIcon(t: string): string {
  if (t.includes("late")) return "clock";
  if (t.includes("risk")) return "shield";
  if (t.includes("payment")) return "credit-card";
  if (t.includes("sanad")) return "file-text";
  return "alert";
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => operationsApi.alerts(),
  });

  async function resolve(id: number) {
    await operationsApi.resolveAlert(id);
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  }

  const filtered = (data ?? []).filter((a) => {
    const matchSeverity = severityFilter === "all" || a.severity === severityFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSeverity && matchStatus;
  });

  const openCount = (data ?? []).filter((a) => a.status === "open").length;
  const criticalCount = (data ?? []).filter(
    (a) => a.severity === "critical" && a.status === "open"
  ).length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Operational alerts</h1>
      <p className="text-neutral-500 mb-4">
        Risk events detected by the platform that need human attention.
      </p>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{openCount}</span>
          <span className="text-neutral-500">open</span>
          {criticalCount > 0 && (
            <Badge className="bg-red-600 text-white border-0 ml-1">
              {criticalCount} critical
            </Badge>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
            {data && data.length > 0
              ? "No alerts match your filters."
              : "No open alerts. Everything looks clean."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className={a.status !== "open" ? "opacity-60" : ""}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    a.severity === "critical"
                      ? "bg-red-100"
                      : a.severity === "high"
                      ? "bg-orange-100"
                      : "bg-amber-100"
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      a.severity === "critical"
                        ? "text-red-600"
                        : a.severity === "high"
                        ? "text-orange-600"
                        : "text-amber-600"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">
                      {a.type.replace(/_/g, " ")}
                    </p>
                    <Badge className={`border-0 ${severityColor(a.severity)}`}>
                      {a.severity}
                    </Badge>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                  <p className="text-sm text-neutral-600 mt-1">{a.message}</p>
                  <p className="text-xs text-neutral-400 mt-2">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {a.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolve(a.id)}
                  >
                    Resolve
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
