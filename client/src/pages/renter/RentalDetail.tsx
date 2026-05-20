import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  CreditCard,
  FileSignature,
  ScrollText,
  Banknote,
  CalendarDays,
  XCircle,
  Truck,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  rentalsApi,
  paymentsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { toast } from "@/hooks/useToast";

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { color: string; icon: typeof Clock; label?: string }> = {
  draft:                  { color: "bg-neutral-700 text-neutral-200",   icon: Clock },
  pending_risk_review:    { color: "bg-amber-900/60 text-amber-300",   icon: Clock,        label: "Risk review" },
  pending_legal_signing:  { color: "bg-amber-900/60 text-amber-300",   icon: FileSignature, label: "Awaiting signature" },
  pending_payment:        { color: "bg-amber-900/60 text-amber-300",   icon: CreditCard,   label: "Pending payment" },
  confirmed:              { color: "bg-blue-900/60 text-blue-300",     icon: CheckCircle },
  in_fulfillment:         { color: "bg-blue-900/60 text-blue-300",     icon: Package },
  out_for_delivery:       { color: "bg-blue-900/60 text-blue-300",     icon: Truck },
  delivered:              { color: "bg-green-900/60 text-green-300",   icon: CheckCircle },
  in_use:                 { color: "bg-green-900/60 text-green-300",   icon: CheckCircle,  label: "Active" },
  awaiting_return:        { color: "bg-amber-900/60 text-amber-300",   icon: Clock },
  returned:               { color: "bg-green-900/60 text-green-300",   icon: CheckCircle },
  inspection_post_return: { color: "bg-amber-900/60 text-amber-300",   icon: Clock,        label: "Post-return inspection" },
  closed_clean:           { color: "bg-green-900/60 text-green-300",   icon: CheckCircle,  label: "Closed" },
  closed_with_penalty:    { color: "bg-red-900/60 text-red-300",       icon: AlertCircle,  label: "Closed (penalty)" },
  disputed:               { color: "bg-red-900/60 text-red-300",       icon: AlertCircle },
  cancelled:              { color: "bg-neutral-700 text-neutral-400",  icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0 text-xs`}>
      <Icon className="w-3 h-3 mr-1" />
      {meta.label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineStep {
  key: string;
  label: string;
  date?: string | null;
  icon: typeof Clock;
}

function buildTimeline(rental: Rental): TimelineStep[] {
  return [
    { key: "created",   label: "Created",   date: rental.createdAt,    icon: CircleDot },
    { key: "confirmed", label: "Confirmed", date: rental.confirmedAt,  icon: CheckCircle },
    { key: "delivered", label: "Delivered", date: rental.deliveredAt,  icon: Truck },
    { key: "active",    label: "Active",    date: rental.deliveredAt ? rental.deliveredAt : null, icon: Package },
    { key: "returned",  label: "Returned",  date: rental.returnedAt,   icon: CheckCircle },
    { key: "closed",    label: "Closed",    date: rental.closedAt,     icon: CheckCircle },
  ];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason.trim());
      await queryClient.invalidateQueries({ queryKey: ["rental", id] });
      toast({ title: "Rental cancelled", variant: "destructive" });
      setCancelOpen(false);
      setCancelReason("");
    } catch (err) {
      setError((err as Error).message ?? "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      await paymentsApi.charge(id);
      await queryClient.invalidateQueries({ queryKey: ["rental", id] });
      toast({ title: "Payment processed successfully", variant: "success" });
    } catch (err) {
      setError((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  // Loading / error states
  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-900 bg-neutral-950">
          <CardContent className="p-12 text-center text-neutral-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <p>Rental not found or you don't have access.</p>
            <Button
              variant="ghost"
              className="mt-4 text-amber-500 hover:text-amber-400"
              onClick={() => navigate("/my-rentals")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to my rentals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const timeline = buildTimeline(rental);
  const canCancel = CANCELLABLE_STATUSES.has(rental.status);
  const canPay = rental.status === "pending_payment";

  // Find the last completed step index for the timeline connector
  let lastCompleted = -1;
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i].date) {
      lastCompleted = i;
      break;
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-amber-500 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        My rentals
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-xs text-neutral-500 mb-1">{rental.reference}</p>
          <h1 className="text-3xl font-bold text-neutral-100">Rental details</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {rental.startDate} &rarr; {rental.endDate}
            <span className="text-neutral-500 ml-2">({rental.durationDays} days)</span>
          </p>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 text-sm text-red-300 bg-red-950 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <Card className="mb-6 bg-neutral-950 border-neutral-800">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-5 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-500" />
            Lifecycle
          </h2>
          <div className="relative flex items-start justify-between">
            {timeline.map((step, i) => {
              const completed = !!step.date;
              const isCurrent = i === lastCompleted;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  {/* Connector line */}
                  {i < timeline.length - 1 && (
                    <div
                      className={`absolute top-3 left-1/2 w-full h-0.5 ${
                        i < lastCompleted ? "bg-amber-500" : "bg-neutral-800"
                      }`}
                    />
                  )}
                  {/* Icon dot */}
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                      completed
                        ? isCurrent
                          ? "bg-amber-500 text-neutral-950"
                          : "bg-amber-500/20 text-amber-500"
                        : "bg-neutral-800 text-neutral-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p
                    className={`text-xs mt-2 font-medium ${
                      completed ? "text-neutral-200" : "text-neutral-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {formatDate(step.date)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Pricing Breakdown ─────────────────────────────────────────── */}
        <Card className="bg-neutral-950 border-neutral-800">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-500" />
              Pricing breakdown
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>
                  {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays} days
                </span>
                <span className="text-neutral-200">{formatSar(rental.rentalSubtotalHalalas)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Platform fee</span>
                <span className="text-neutral-200">{formatSar(rental.platformFeeHalalas)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>VAT (15%)</span>
                <span className="text-neutral-200">{formatSar(rental.vatHalalas)}</span>
              </div>
              <div className="border-t border-neutral-800 pt-3 flex justify-between font-bold text-base">
                <span className="text-neutral-200">Total</span>
                <span className="text-amber-500">{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Legal Commitment ──────────────────────────────────────────── */}
        <Card className="bg-neutral-950 border-neutral-800">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-amber-500" />
              Legal commitment
            </h2>
            {legal ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-neutral-400">
                  <span>Status</span>
                  <Badge
                    className={`border-0 text-xs ${
                      legal.status === "signed"
                        ? "bg-green-900/60 text-green-300"
                        : "bg-amber-900/60 text-amber-300"
                    }`}
                  >
                    {legal.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Commitment</span>
                  <span className="text-neutral-200">
                    {formatSar(legal.commitmentHalalas)}{" "}
                    <span className="text-neutral-500">({legal.commitmentPct}%)</span>
                  </span>
                </div>
                {legal.signedAt && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Signed</span>
                    <span className="text-neutral-200">{formatDateTime(legal.signedAt)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment yet.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Sanad (promissory note) ───────────────────────────────────── */}
        {sanad && (
          <Card className="bg-neutral-950 border-neutral-800">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-amber-500" />
                Sanad (promissory note)
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-neutral-400">
                  <span>Status</span>
                  <Badge
                    className={`border-0 text-xs ${
                      sanad.status === "discharged"
                        ? "bg-green-900/60 text-green-300"
                        : sanad.status === "under_execution"
                          ? "bg-red-900/60 text-red-300"
                          : "bg-amber-900/60 text-amber-300"
                    }`}
                  >
                    {sanad.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {sanad.nafithReference && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Nafith ref</span>
                    <span className="font-mono text-neutral-200">{sanad.nafithReference}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Principal</span>
                  <span className="text-neutral-200">{formatSar(sanad.principalHalalas)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Maturity date</span>
                  <span className="text-neutral-200">{formatDate(sanad.maturityDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Payments ──────────────────────────────────────────────────── */}
        <Card className={`bg-neutral-950 border-neutral-800 ${!sanad ? "" : "md:col-span-2"}`}>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              Payments
            </h2>
            {payments.length === 0 ? (
              <p className="text-sm text-neutral-500">No payments recorded.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p: Payment) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          p.status === "captured"
                            ? "bg-green-500"
                            : p.status === "refunded"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm text-neutral-200 font-medium capitalize">
                          {p.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {p.gateway}
                          {p.invoiceNumber && <> &middot; {p.invoiceNumber}</>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-neutral-200">
                        {formatSar(p.amountHalalas)}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {p.capturedAt
                          ? formatDateTime(p.capturedAt)
                          : formatDateTime(p.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────── */}
      {(canPay || canCancel) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {canPay && (
            <Button
              onClick={handlePay}
              disabled={paying}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {paying ? "Processing..." : `Pay ${formatSar(rental.totalPayableHalalas)}`}
            </Button>
          )}
          {canCancel && !cancelOpen && (
            <Button
              variant="outline"
              onClick={() => setCancelOpen(true)}
              className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel rental
            </Button>
          )}
        </div>
      )}

      {/* Cancel form */}
      {cancelOpen && (
        <Card className="mt-4 bg-neutral-950 border-red-900">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-300 mb-3">
              Are you sure you want to cancel this rental? Please provide a reason:
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation..."
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                variant="destructive"
              >
                {cancelling ? "Cancelling..." : "Confirm cancellation"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelReason("");
                }}
                className="text-neutral-400 hover:text-neutral-200"
              >
                Never mind
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
