import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, Flag } from "lucide-react";
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
import { rentalsApi, disputesApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

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

const DISPUTABLE_STATUSES = [
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
  "closed_with_penalty",
];

type DisputeCategory = "damage" | "loss" | "fraud" | "service" | "billing";

export default function MyRentals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const [disputeRentalId, setDisputeRentalId] = useState<number | null>(null);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>("service");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  async function submitDispute() {
    if (!disputeRentalId || disputeSummary.length < 10) return;
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      await disputesApi.open({
        rentalId: disputeRentalId,
        category: disputeCategory,
        summary: disputeSummary,
      });
      setDisputeRentalId(null);
      setDisputeSummary("");
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
    } catch (err) {
      setDisputeError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setDisputeSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't rented anything yet.</p>
            <a
              href="/browse"
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Browse the collection →
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
                    <p className="font-mono text-xs text-neutral-500">
                      {r.reference}
                    </p>
                    <p className="font-semibold mt-1">
                      {r.startDate} → {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">
                        ({r.durationDays} days)
                      </span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      {DISPUTABLE_STATUSES.includes(r.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setDisputeRentalId(r.id)}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Open dispute
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase">Total paid</p>
                    <p className="font-bold text-lg">
                      {formatSar(r.totalPayableHalalas)}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Commitment {formatSar(r.legalCommitmentHalalas)} (
                      {r.legalCommitmentPct}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {disputeRentalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Open a dispute</h2>
              <p className="text-sm text-neutral-500">
                Describe the issue with your rental. Our team will review and
                respond.
              </p>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={disputeCategory}
                  onValueChange={(v) => setDisputeCategory(v as DisputeCategory)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="service">Service issue</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={disputeSummary}
                  onChange={(e) => setDisputeSummary(e.target.value)}
                  placeholder="Describe the issue in detail (at least 10 characters)…"
                  rows={4}
                  className="mt-1"
                />
              </div>

              {disputeError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  {disputeError}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDisputeRentalId(null);
                    setDisputeSummary("");
                    setDisputeError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={disputeSubmitting || disputeSummary.length < 10}
                  onClick={submitDispute}
                >
                  {disputeSubmitting ? "Submitting…" : "Submit dispute"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
