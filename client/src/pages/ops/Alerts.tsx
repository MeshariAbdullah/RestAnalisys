import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { operationsApi } from "@/lib/api";

const SEVERITIES = ["all", "critical", "high", "medium", "low"];
const STATUSES = ["all", "open", "acknowledged", "resolved"];

function severityColor(s: string): string {
  if (s === "critical") return "bg-red-600 text-white";
  if (s === "high") return "bg-red-100 text-red-700";
  if (s === "medium") return "bg-amber-100 text-amber-800";
  return "bg-neutral-200 text-neutral-700";
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => operationsApi.alerts(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data;
    if (severity !== "all") {
      items = items.filter((a) => a.severity === severity);
    }
    if (status !== "all") {
      items = items.filter((a) => a.status === status);
    }
    return items;
  }, [data, severity, status]);

  const counts = useMemo(() => {
    if (!data) return { critical: 0, high: 0, open: 0 };
    return {
      critical: data.filter((a) => a.severity === "critical" && a.status === "open").length,
      high: data.filter((a) => a.severity === "high" && a.status === "open").length,
      open: data.filter((a) => a.status === "open").length,
    };
  }, [data]);

  async function resolve(id: number) {
    await operationsApi.resolveAlert(id);
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Operational alerts</h1>
      <p className="text-neutral-500 mb-6">
        Risk events detected by the platform that need human attention.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className={counts.critical > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{counts.critical}</p>
            <p className="text-xs text-neutral-500">Critical</p>
          </CardContent>
        </Card>
        <Card className={counts.high > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{counts.high}</p>
            <p className="text-xs text-neutral-500">High</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{counts.open}</p>
            <p className="text-xs text-neutral-500">Total open</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-sm text-neutral-500">Severity:</span>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                severity === s
                  ? "bg-amber-500 text-neutral-950 font-medium"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Status:</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                status === s
                  ? "bg-amber-500 text-neutral-950 font-medium"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
            No alerts match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className={a.status === "resolved" ? "opacity-60" : ""}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
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
