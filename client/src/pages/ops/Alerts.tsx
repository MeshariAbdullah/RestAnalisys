import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { operationsApi } from "@/lib/api";

function severityColor(s: string): string {
  if (s === "critical") return "bg-red-600 text-white";
  if (s === "high") return "bg-red-100 text-red-700";
  if (s === "medium") return "bg-amber-100 text-amber-800";
  return "bg-neutral-200 text-neutral-700";
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => operationsApi.alerts(),
  });

  async function resolve(id: number) {
    await operationsApi.resolveAlert(id);
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Operational alerts</h1>
      <p className="text-neutral-500 mb-8">
        Risk events detected by the platform that need human attention.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
            No open alerts. Everything looks clean.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <Card
              key={a.id}
              className={a.status === "open" ? "" : "opacity-60"}
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
