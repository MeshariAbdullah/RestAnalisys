import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Shield,
  Package,
  FileSignature,
  CreditCard,
  Truck,
  Search,
  CircleDot,
  Receipt,
  Gavel,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  rentalsApi,
  legalApi,
  paymentsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileSignature },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Truck },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-blue-100 text-blue-700", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Search },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertTriangle },
  enforcement: { color: "bg-red-200 text-red-800", icon: Shield },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending_risk_review;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0 text-sm px-3 py-1`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const LIFECYCLE_STEPS = [
  { key: "pending_risk_review", label: "Risk Review", icon: Shield },
  { key: "pending_legal_signing", label: "Legal Signing", icon: FileSignature },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "out_for_delivery", label: "Delivery", icon: Truck },
  { key: "active", label: "Active", icon: Package },
  { key: "return_in_transit", label: "Return", icon: Truck },
  { key: "under_inspection", label: "Inspection", icon: Search },
  { key: "closed", label: "Closed", icon: CheckCircle },
];

const TERMINAL_STATUSES = new Set([
  "closed",
  "closed_with_penalty",
  "in_dispute",
  "enforcement",
  "cancelled",
]);

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
]);

function getStepState(
  stepKey: string,
  currentStatus: string,
  stepIndex: number,
  currentIndex: number
): "completed" | "current" | "future" {
  if (TERMINAL_STATUSES.has(currentStatus)) {
    if (currentStatus === "cancelled") {
      return stepIndex <= currentIndex ? "completed" : "future";
    }
    return "completed";
  }
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "future";
}

function Timeline({ status }: { status: string }) {
  const currentIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  const effectiveIndex = currentIndex >= 0 ? currentIndex : LIFECYCLE_STEPS.length - 1;

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {LIFECYCLE_STEPS.map((step, i) => {
        const state = getStepState(step.key, status, i, effectiveIndex);
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center min-w-[80px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  state === "completed"
                    ? "bg-green-500 text-white"
                    : state === "current"
                    ? "bg-amber-500 text-white ring-4 ring-amber-100"
                    : "bg-neutral-200 text-neutral-400"
                }`}
              >
                {state === "completed" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : state === "current" ? (
                  <CircleDot className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <p
                className={`text-[11px] mt-1.5 text-center leading-tight ${
                  state === "current"
                    ? "text-amber-700 font-semibold"
                    : state === "completed"
                    ? "text-green-700 font-medium"
                    : "text-neutral-400"
                }`}
              >
                {step.label}
              </p>
            </div>
            {i < LIFECYCLE_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-6 mt-[-12px] shrink-0 ${
                  state === "completed" ? "bg-green-400" : "bg-neutral-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
      <div>
        <p className="text-sm font-medium capitalize">
          {payment.type.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-neutral-500">
          {payment.gateway} · {new Date(payment.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatSar(payment.amountHalalas)}</p>
        <Badge
          className={`text-[10px] border-0 ${
            payment.status === "captured"
              ? "bg-green-100 text-green-700"
              : payment.status === "failed"
              ? "bg-red-100 text-red-700"
              : payment.status === "refunded"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {payment.status}
        </Badge>
      </div>
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => rentalsApi.cancel(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  const payMutation = useMutation({
    mutationFn: () => paymentsApi.charge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Link href="/my-rentals">
          <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to rentals
          </a>
        </Link>
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
            <p>Could not load this rental.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to rentals
        </a>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{rental.reference}</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {rental.startDate} → {rental.endDate} · {rental.durationDays} days
          </p>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
            Rental lifecycle
          </h2>
          <Timeline status={rental.status} />
          {rental.status === "cancelled" && (
            <p className="mt-3 text-sm text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
              This rental was cancelled.
            </p>
          )}
          {(rental.status === "in_dispute" || rental.status === "enforcement") && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {rental.status === "in_dispute"
                ? "This rental is under dispute investigation."
                : "This rental is under legal enforcement via Sanad execution."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Price breakdown */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
              Price breakdown
            </h2>
            <div className="space-y-3">
              <Row label={`Daily rate × ${rental.durationDays} days`} value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t border-neutral-200 pt-3">
                <Row label="Total payable" value={formatSar(rental.totalPayableHalalas)} bold />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
              Legal commitment
            </h2>
            <div className="space-y-3">
              <Row label="Commitment amount" value={formatSar(rental.legalCommitmentHalalas)} bold />
              <Row label="Commitment percentage" value={`${rental.legalCommitmentPct}%`} />
              <Row label="Trust score at booking" value={String(rental.trustScoreAtBooking ?? "—")} />
              {legal && (
                <>
                  <div className="border-t border-neutral-200 pt-3">
                    <Row label="Contract version" value={legal.contractVersion} />
                    <Row
                      label="Signing status"
                      value={legal.signedAt ? `Signed ${new Date(legal.signedAt).toLocaleDateString()}` : legal.status.replace(/_/g, " ")}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sanad info */}
      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
              Sanad (promissory note)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
              <Row label="Nafith reference" value={sanad.nafithReference ?? "—"} />
              <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
              <Row label="Amount due" value={formatSar(sanad.dueHalalas)} bold />
              <Row label="Maturity date" value={sanad.maturityDate ?? "—"} />
              {sanad.executionCaseNumber && (
                <Row label="Execution case" value={sanad.executionCaseNumber} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
            Payments
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">No payments recorded yet.</p>
          ) : (
            <div>
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {rental.status === "pending_legal_signing" && legal && (
          <Link href={`/legal/${legal.id}`}>
            <a>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                <FileSignature className="w-4 h-4 mr-2" />
                Sign Contract
              </Button>
            </a>
          </Link>
        )}

        {rental.status === "pending_payment" && (
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {payMutation.isPending ? "Processing…" : "Pay Now"}
          </Button>
        )}

        {CANCELLABLE_STATUSES.has(rental.status) && (
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              const reason = window.prompt("Reason for cancellation:");
              if (reason && reason.length >= 3) {
                cancelMutation.mutate(reason);
              }
            }}
            disabled={cancelMutation.isPending}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {cancelMutation.isPending ? "Cancelling…" : "Cancel Rental"}
          </Button>
        )}

        {rental.status === "active" && (
          <Button variant="outline" disabled>
            <Gavel className="w-4 h-4 mr-2" />
            Open Dispute
          </Button>
        )}
      </div>

      {(cancelMutation.isError || payMutation.isError) && (
        <p className="text-sm text-red-600 mt-3">
          {(cancelMutation.error as Error)?.message ??
            (payMutation.error as Error)?.message ??
            "An error occurred."}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
