import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

const CANCELLABLE = new Set(["draft", "pending_payment", "pending_legal_signing"]);

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function MyRentals() {
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<Rental | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  async function confirmCancel() {
    if (!cancelTarget || !cancelReason.trim()) return;
    try {
      await rentalsApi.cancel(cancelTarget.id, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      toast({ title: "Rental cancelled", description: `Rental ${cancelTarget.reference} has been cancelled.`, variant: "success" });
    } catch (err) {
      toast({ title: "Cancellation failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCancelTarget(null);
      setCancelReason("");
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">Track contracts, shipments and returns.</p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't rented anything yet.</p>
            <a href="/browse" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
              Browse the collection
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((r: Rental) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                    <p className="font-semibold mt-1">
                      {r.startDate} &rarr; {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">({r.durationDays} days)</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      {CANCELLABLE.has(r.status) && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelTarget(r)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase">Total paid</p>
                    <p className="font-bold text-lg">{formatSar(r.totalPayableHalalas)}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Commitment {formatSar(r.legalCommitmentHalalas)} ({r.legalCommitmentPct}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel rental</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel rental {cancelTarget?.reference}? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep rental</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmCancel} disabled={!cancelReason.trim()}>
              Cancel rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
