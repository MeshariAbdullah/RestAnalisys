import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Package,
  AlertCircle,
  XCircle,
  FileText,
  Shield,
  CreditCard,
  Truck,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { toast } from "@/lib/use-toast";

const STATUS_META: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Risk review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText, label: "Awaiting signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Truck, label: "Out for delivery" },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Active" },
  return_in_transit: { color: "bg-blue-100 text-blue-700", icon: Truck, label: "Return in transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under inspection" },
  closed: { color: "bg-neutral-200 text-neutral-700", icon: CheckCircle, label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Closed (penalty)" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: Scale, label: "In dispute" },
  enforcement: { color: "bg-red-200 text-red-900", icon: AlertCircle, label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle, label: "Cancelled" },
};

const CANCELLABLE = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
  "confirmed",
]);

const DISPUTABLE = new Set([
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
  "closed_with_penalty",
]);

const DISPUTE_CATEGORIES = [
  { value: "damage", label: "Damage" },
  { value: "loss", label: "Loss" },
  { value: "fraud", label: "Fraud" },
  { value: "service", label: "Service issue" },
  { value: "billing", label: "Billing" },
] as const;

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("damage");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await rentalsApi.cancel(id, cancelReason.trim());
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      setCancelling(false);
      setCancelReason("");
      toast({ title: "Rental cancelled", variant: "success" });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispute() {
    if (!disputeSummary.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary.trim(),
      });
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowDisputeForm(false);
      setDisputeSummary("");
      toast({ title: "Dispute submitted", description: "Our team will review it shortly.", variant: "success" });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-neutral-500">Rental not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/my-rentals")}>
          Back to rentals
        </Button>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const meta = STATUS_META[rental.status] ?? STATUS_META.pending_risk_review;
  const Icon = meta.icon;

  const timeline = buildTimeline(rental, legal, sanad);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to my rentals
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
          <p className="text-neutral-500 mt-1">
            {rental.startDate} → {rental.endDate}
            <span className="ml-2">({rental.durationDays} days)</span>
          </p>
        </div>
        <Badge className={`${meta.color} hover:${meta.color} border-0 text-sm px-3 py-1`}>
          <Icon className="w-3.5 h-3.5 mr-1.5" />
          {meta.label}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          {/* Pricing */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                Pricing breakdown
              </h2>
              <div className="space-y-2 text-sm">
                <Row label={`Daily rate × ${rental.durationDays} days`} value={formatSar(rental.rentalSubtotalHalalas)} />
                <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
                <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
                <div className="border-t pt-2 mt-2">
                  <Row label="Total" value={formatSar(rental.totalPayableHalalas)} bold />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal commitment */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                <Shield className="w-4 h-4 inline mr-1.5" />
                Legal commitment
              </h2>
              <div className="space-y-2 text-sm">
                <Row label="Commitment amount" value={formatSar(rental.legalCommitmentHalalas)} />
                <Row label="Commitment percentage" value={`${rental.legalCommitmentPct}%`} />
                {legal && (
                  <>
                    <Row label="Contract status" value={legal.status.replace(/_/g, " ")} />
                    {legal.signedAt && <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />}
                  </>
                )}
                {sanad && (
                  <>
                    <Row label="Sanad status" value={sanad.status.replace(/_/g, " ")} />
                    {sanad.nafithReference && <Row label="Nafith ref" value={sanad.nafithReference} />}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          {payments && payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                  <CreditCard className="w-4 h-4 inline mr-1.5" />
                  Payments
                </h2>
                <div className="space-y-3">
                  {payments.map((p: Payment) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <span className="capitalize">{p.type.replace(/_/g, " ")}</span>
                        <span className="text-neutral-400 ml-2 text-xs">
                          {p.gateway} {p.gatewayTransactionId ? `#${p.gatewayTransactionId}` : ""}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                        <Badge className="ml-2 text-[10px]" variant="outline">
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Timeline */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                Timeline
              </h2>
              <div className="space-y-3">
                {timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${event.done ? "bg-green-500" : "bg-neutral-300"}`} />
                    <div>
                      <p className={event.done ? "font-medium" : "text-neutral-400"}>
                        {event.label}
                      </p>
                      {event.date && (
                        <p className="text-xs text-neutral-500">
                          {new Date(event.date).toLocaleDateString("en-SA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cancel action */}
          {CANCELLABLE.has(rental.status) && !cancelling && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setCancelling(true)}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Cancel rental
            </Button>
          )}

          {cancelling && (
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-red-900">Cancel this rental?</p>
                <textarea
                  className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                  rows={3}
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleCancel}
                    disabled={submitting || !cancelReason.trim()}
                  >
                    {submitting ? "Cancelling…" : "Confirm cancel"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setCancelling(false); setCancelReason(""); }}
                  >
                    Keep rental
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dispute action */}
          {DISPUTABLE.has(rental.status) && !showDisputeForm && (
            <Button
              variant="outline"
              className="w-full text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={() => setShowDisputeForm(true)}
            >
              <Scale className="w-4 h-4 mr-1.5" />
              Open dispute
            </Button>
          )}

          {showDisputeForm && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-900">Open a dispute</p>
                <select
                  className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                >
                  {DISPUTE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <textarea
                  className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                  rows={4}
                  placeholder="Describe the issue..."
                  value={disputeSummary}
                  onChange={(e) => setDisputeSummary(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleDispute}
                    disabled={submitting || !disputeSummary.trim()}
                  >
                    {submitting ? "Submitting…" : "Submit dispute"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowDisputeForm(false); setDisputeSummary(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {actionError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {actionError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? "font-bold text-base" : "font-medium"}>{value}</span>
    </div>
  );
}

function buildTimeline(
  rental: Rental,
  legal: LegalCommitment | null,
  sanad: SanadRecord | null
) {
  const events: Array<{ label: string; date: string | null; done: boolean }> = [];

  events.push({
    label: "Rental created",
    date: rental.createdAt,
    done: true,
  });

  if (legal) {
    events.push({
      label: "Contract signed",
      date: legal.signedAt ?? null,
      done: !!legal.signedAt,
    });
  }

  events.push({
    label: "Payment confirmed",
    date: rental.confirmedAt ?? null,
    done: !!rental.confirmedAt,
  });

  events.push({
    label: "Delivered",
    date: rental.deliveredAt ?? null,
    done: !!rental.deliveredAt,
  });

  events.push({
    label: "Returned",
    date: rental.returnedAt ?? null,
    done: !!rental.returnedAt,
  });

  events.push({
    label: "Closed",
    date: rental.closedAt ?? null,
    done: !!rental.closedAt,
  });

  if (rental.status === "cancelled") {
    events.push({
      label: "Cancelled",
      date: rental.closedAt ?? rental.createdAt,
      done: true,
    });
  }

  return events;
}
