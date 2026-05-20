import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { operationsApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";

type Severity = "critical" | "high" | "medium" | "low";
type SeverityFilter = "all" | Severity;

const SEVERITY_CONFIG: Record<
  Severity,
  { badge: string; icon: string; indicator: string }
> = {
  critical: {
    badge: "bg-red-600 text-white",
    icon: "bg-red-100",
    indicator: "bg-red-500",
  },
  high: {
    badge: "bg-red-100 text-red-700",
    icon: "bg-red-50",
    indicator: "bg-red-400",
  },
  medium: {
    badge: "bg-amber-100 text-amber-800",
    icon: "bg-amber-50",
    indicator: "bg-amber-400",
  },
  low: {
    badge: "bg-green-100 text-green-700",
    icon: "bg-green-50",
    indicator: "bg-green-400",
  },
};

function severityColor(s: string): string {
  return (
    SEVERITY_CONFIG[s as Severity]?.badge ?? "bg-neutral-200 text-neutral-700"
  );
}

function severityIconBg(s: string): string {
  return SEVERITY_CONFIG[s as Severity]?.icon ?? "bg-neutral-100";
}

function severityIndicator(s: string): string {
  return SEVERITY_CONFIG[s as Severity]?.indicator ?? "bg-neutral-400";
}

function SeverityIcon({ severity }: { severity: string }) {
  const cls = "w-5 h-5";
  switch (severity) {
    case "critical":
      return <ShieldAlert className={`${cls} text-red-600`} />;
    case "high":
      return <AlertTriangle className={`${cls} text-red-500`} />;
    case "medium":
      return <AlertTriangle className={`${cls} text-amber-600`} />;
    case "low":
      return <Info className={`${cls} text-green-600`} />;
    default:
      return <AlertTriangle className={`${cls} text-neutral-600`} />;
  }
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => operationsApi.alerts(),
    refetchInterval: 30_000,
  });

  const counts = useMemo(() => {
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    if (!data) return c;
    for (const a of data) {
      c.all++;
      if (a.severity in c) c[a.severity as Severity]++;
    }
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((a) => a.severity === filter);
  }, [data, filter]);

  async function resolve(id: number) {
    setResolvingId(id);
    try {
      await operationsApi.resolveAlert(id);
      await qc.invalidateQueries({ queryKey: ["alerts"] });
      toast({
        title: "Alert resolved",
        description: "The alert has been marked as resolved.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to resolve alert",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Operational alerts</h1>
      <p className="text-neutral-500 mb-8">
        Risk events detected by the platform that need human attention.
      </p>

      {/* Severity filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as SeverityFilter)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            All
            {counts.all > 0 && (
              <Badge
                variant="outline"
                className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
              >
                {counts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="high" className="gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            High
            {(counts.critical + counts.high) > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-xs border-0 bg-red-100 text-red-700">
                {counts.critical + counts.high}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="medium" className="gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            Medium
            {counts.medium > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-xs border-0 bg-amber-100 text-amber-800">
                {counts.medium}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="low" className="gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            Low
            {counts.low > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-xs border-0 bg-green-100 text-green-700">
                {counts.low}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ShieldCheck className="w-14 h-14 mx-auto mb-4 text-green-300" />
            <p className="text-lg font-medium text-neutral-700 mb-1">
              {filter === "all"
                ? "No open alerts"
                : `No ${filter} severity alerts`}
            </p>
            <p className="text-sm">
              {filter === "all"
                ? "Everything looks clean. We'll keep watching."
                : "Try switching to a different filter to see other alerts."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className={`relative overflow-hidden ${a.status === "open" ? "" : "opacity-60"}`}
            >
              {/* Color-coded severity indicator bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${severityIndicator(a.severity)}`}
              />
              <CardContent className="p-5 pl-6 flex items-start gap-4">
                <div
                  className={`shrink-0 w-10 h-10 ${severityIconBg(a.severity)} rounded-lg flex items-center justify-center`}
                >
                  <SeverityIcon severity={a.severity} />
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
                    disabled={resolvingId === a.id}
                    onClick={() => resolve(a.id)}
                  >
                    {resolvingId === a.id ? "Resolving…" : "Resolve"}
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
