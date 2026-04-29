import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { disputesApi, type Dispute } from "@/lib/api";
import { toast } from "@/hooks/useToast";

type Resolution =
  | "resolved_for_renter"
  | "resolved_for_platform"
  | "resolved_for_owner"
  | "escalated_to_legal";

function statusColor(s: string): string {
  if (s === "open") return "bg-amber-100 text-amber-800";
  if (s === "under_review") return "bg-blue-100 text-blue-700";
  if (s.startsWith("resolved")) return "bg-green-100 text-green-700";
  if (s === "escalated_to_legal") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function DisputesPage() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution>(
    "resolved_for_renter"
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: () => disputesApi.list(),
  });

  async function resolve(id: number) {
    setError(null);
    try {
      await disputesApi.resolve({ disputeId: id, resolution, notes });
      toast({ title: "Dispute resolved", description: `Dispute #${id} resolved.`, variant: "success" });
      setOpenId(null);
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["disputes"] });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast({ title: "Resolution failed", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Disputes</h1>
      <p className="text-neutral-500 mb-8">
        Cases between renters, owners and the platform.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Gavel className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No disputes.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((d: Dispute) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Gavel className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">Dispute #{d.id}</p>
                      <Badge className={`border-0 ${statusColor(d.status)}`}>
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline">{d.category}</Badge>
                      <Badge variant="outline">{d.severity}</Badge>
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">{d.summary}</p>
                    <p className="text-xs text-neutral-400 mt-2">
                      Rental #{d.rentalId} · Opened{" "}
                      {new Date(d.openedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {d.status !== "resolved_for_renter" &&
                    d.status !== "resolved_for_platform" &&
                    d.status !== "resolved_for_owner" &&
                    d.status !== "escalated_to_legal" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setOpenId(openId === d.id ? null : d.id)
                        }
                        className="bg-neutral-900 hover:bg-neutral-800"
                      >
                        Resolve
                      </Button>
                    )}
                </div>

                {openId === d.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <Select
                      value={resolution}
                      onValueChange={(v) => setResolution(v as Resolution)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resolved_for_renter">
                          Resolve for renter
                        </SelectItem>
                        <SelectItem value="resolved_for_platform">
                          Resolve for platform
                        </SelectItem>
                        <SelectItem value="resolved_for_owner">
                          Resolve for owner
                        </SelectItem>
                        <SelectItem value="escalated_to_legal">
                          Escalate to legal / Nafith
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Resolution notes (mandatory)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={() => resolve(d.id)}
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={!notes.trim()}
                    >
                      Submit resolution
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}
    </div>
  );
}
