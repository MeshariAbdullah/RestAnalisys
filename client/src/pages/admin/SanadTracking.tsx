import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, AlertOctagon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { legalApi, formatSar, type SanadRecord } from "@/lib/api";
import { useToast } from "@/components/ui/toast-provider";

function statusColor(s: string): string {
  if (s === "issued" || s === "active") return "bg-blue-100 text-blue-700";
  if (s === "signed") return "bg-green-100 text-green-700";
  if (s === "discharged") return "bg-green-100 text-green-700";
  if (s === "defaulted") return "bg-amber-100 text-amber-800";
  if (s === "under_execution") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function SanadTracking() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const allQuery = useQuery({
    queryKey: ["sanads"],
    queryFn: () => legalApi.sanads(),
  });

  const enforceQuery = useQuery({
    queryKey: ["sanads-enforcement"],
    queryFn: () => legalApi.pendingEnforcement(),
  });

  async function execute(s: SanadRecord) {
    const reason = prompt("Reason to file execution?");
    if (!reason) return;
    setError(null);
    try {
      await legalApi.executeSanad(s.id, reason);
      addToast({ title: "Sanad execution filed via Najiz", variant: "warning" });
      await qc.invalidateQueries({ queryKey: ["sanads"] });
      await qc.invalidateQueries({ queryKey: ["sanads-enforcement"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function discharge(s: SanadRecord) {
    if (!confirm("Mark this Sanad as discharged?")) return;
    setError(null);
    try {
      await legalApi.dischargeSanad(s.id);
      addToast({ title: "Sanad discharged successfully", variant: "success" });
      await qc.invalidateQueries({ queryKey: ["sanads"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function SanadRow({ s }: { s: SanadRecord }) {
    return (
      <Card key={s.id}>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">
              Sanad #{s.id} · Rental #{s.rentalId}
            </p>
            <p className="text-xs text-neutral-500 font-mono">
              {s.nafithReference ?? "—"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`border-0 ${statusColor(s.status)}`}>
                {s.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-neutral-500">
                Due {formatSar(s.dueHalalas)}
              </span>
              <span className="text-xs text-neutral-500">
                Matures {s.maturityDate}
              </span>
              {s.executionCaseNumber && (
                <span className="text-xs text-red-600 font-mono">
                  Case {s.executionCaseNumber}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {(s.status === "issued" ||
              s.status === "signed" ||
              s.status === "active") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => discharge(s)}
              >
                Discharge
              </Button>
            )}
            {s.status === "defaulted" && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => execute(s)}
              >
                <AlertOctagon className="w-4 h-4 mr-1" />
                File execution
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Sanad tracking</h1>
      <p className="text-neutral-500 mb-6">
        Electronic promissory notes issued via Nafith.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="mb-5">
          <TabsTrigger value="all">All Sanads</TabsTrigger>
          <TabsTrigger value="enforcement">Pending enforcement</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {allQuery.isLoading ? (
            <p className="text-neutral-500">Loading…</p>
          ) : !allQuery.data || allQuery.data.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                No Sanads issued yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allQuery.data.map((s) => (
                <SanadRow key={s.id} s={s} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enforcement">
          {enforceQuery.isLoading ? (
            <p className="text-neutral-500">Loading…</p>
          ) : !enforceQuery.data || enforceQuery.data.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                No Sanads in default.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {enforceQuery.data.map((s) => (
                <SanadRow key={s.id} s={s} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
