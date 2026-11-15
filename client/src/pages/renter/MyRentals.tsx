import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rentalsApi, disputesApi, formatSar, type Rental } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Clock },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

const CANCELLABLE = ["pending_risk_review", "pending_legal_signing", "pending_payment"];
const DISPUTABLE = ["active", "under_inspection", "closed_with_penalty"];

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

function CancelForm({ rental, onClose }: { rental: Rental; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function handleCancel() {
    if (reason.trim().length < 3) return;
    setLoading(true);
    try {
      await rentalsApi.cancel(rental.id, reason);
      addToast("Rental cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      onClose();
    } catch (e: any) {
      addToast(e.message ?? "Failed to cancel", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 p-4 bg-neutral-50 rounded-lg border space-y-3">
      <div className="flex justify-between items-center">
        <Label className="font-semibold text-sm">Cancel rental {rental.reference}</Label>
        <button onClick={onClose}><X className="w-4 h-4 text-neutral-400" /></button>
      </div>
      <Input
        placeholder="Reason for cancellation (min 3 chars)"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={loading || reason.trim().length < 3} onClick={handleCancel}>
          {loading ? "Cancelling..." : "Confirm Cancel"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Back</Button>
      </div>
    </div>
  );
}

function DisputeForm({ rental, onClose }: { rental: Rental; onClose: () => void }) {
  const [category, setCategory] = useState<"damage" | "loss" | "fraud" | "service" | "billing">("service");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function handleSubmit() {
    if (summary.trim().length < 10) return;
    setLoading(true);
    try {
      await disputesApi.open({ rentalId: rental.id, category, summary });
      addToast("Dispute filed successfully");
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      onClose();
    } catch (e: any) {
      addToast(e.message ?? "Failed to file dispute", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 p-4 bg-neutral-50 rounded-lg border space-y-3">
      <div className="flex justify-between items-center">
        <Label className="font-semibold text-sm">File dispute for {rental.reference}</Label>
        <button onClick={onClose}><X className="w-4 h-4 text-neutral-400" /></button>
      </div>
      <div>
        <Label className="text-xs text-neutral-500">Category</Label>
        <select
          className="w-full mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          value={category}
          onChange={e => setCategory(e.target.value as any)}
        >
          <option value="damage">Damage</option>
          <option value="loss">Loss</option>
          <option value="fraud">Fraud</option>
          <option value="service">Service</option>
          <option value="billing">Billing</option>
        </select>
      </div>
      <Textarea
        placeholder="Describe the issue in detail (min 10 chars)"
        value={summary}
        onChange={e => setSummary(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={loading || summary.trim().length < 10} onClick={handleSubmit}>
          {loading ? "Submitting..." : "Submit Dispute"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Back</Button>
      </div>
    </div>
  );
}

export default function MyRentals() {
  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [disputeId, setDisputeId] = useState<number | null>(null);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

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
                      {r.startDate} → {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">({r.durationDays} days)</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <StatusBadge status={r.status} />
                      {CANCELLABLE.includes(r.status) && cancelId !== r.id && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 h-7 text-xs" onClick={() => { setCancelId(r.id); setDisputeId(null); }}>
                          Cancel
                        </Button>
                      )}
                      {DISPUTABLE.includes(r.status) && disputeId !== r.id && (
                        <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 h-7 text-xs" onClick={() => { setDisputeId(r.id); setCancelId(null); }}>
                          File Dispute
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
                {cancelId === r.id && <CancelForm rental={r} onClose={() => setCancelId(null)} />}
                {disputeId === r.id && <DisputeForm rental={r} onClose={() => setDisputeId(null)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
