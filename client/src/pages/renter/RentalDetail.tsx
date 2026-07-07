import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  FileSignature,
  ShieldCheck,
  CreditCard,
  XCircle,
  Scale,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Status badge (same palette as MyRentals)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileSignature },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  closed: { color: "bg-neutral-200 text-neutral-600", icon: CheckCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle },
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

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  captured: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-blue-100 text-blue-700",
};

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
]);

const DISPUTABLE_STATUSES = new Set([
  "active",
  "closed",
  "closed_clean",
  "closed_with_penalty",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // Cancel form state
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("");
  const [disputeSummary, setDisputeSummary] = useState("");

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: () => rentalsApi.cancel(id, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rental", id] });
      qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowCancelForm(false);
      setCancelReason("");
    },
  });

  const disputeMutation = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rental", id] });
      setShowDisputeForm(false);
      setDisputeCategory("");
      setDisputeSummary("");
    },
  });

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-neutral-100 rounded animate-pulse" />
          <div className="h-48 rounded-xl bg-neutral-100 animate-pulse" />
          <div className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          <div className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
            <p className="font-semibold">Failed to load rental details</p>
            <p className="text-sm text-neutral-500 mt-1">
              {(error as Error)?.message ?? "Rental not found."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/my-rentals")}
            >
              Back to my rentals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = CANCELLABLE_STATUSES.has(rental.status);
  const canDispute =
    DISPUTABLE_STATUSES.has(rental.status) &&
    !payments.some((p) => p.type === "dispute");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <Package className="w-4 h-4" />
        Rental detail
      </div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Rental {rental.reference}</h1>
          <div className="mt-2">
            <StatusBadge status={rental.status} />
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/my-rentals")}>
          Back to my rentals
        </Button>
      </div>

      {/* ── Rental info card ────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Rental information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Reference</p>
                <p className="font-mono mt-1">{rental.reference}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Rental period</p>
                <p className="font-semibold mt-1">
                  {rental.startDate} → {rental.endDate}
                </p>
                <p className="text-neutral-600">{rental.durationDays} days</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Created</p>
                <p className="mt-1">{new Date(rental.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Pricing breakdown</p>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">
                      Daily rate x {rental.durationDays} days
                    </span>
                    <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Platform fee</span>
                    <span>{formatSar(rental.platformFeeHalalas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">VAT</span>
                    <span>{formatSar(rental.vatHalalas)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold">
                    <span>Total</span>
                    <span>{formatSar(rental.totalPayableHalalas)}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Commitment</p>
                <p className="font-bold text-amber-700 mt-1">
                  {formatSar(rental.legalCommitmentHalalas)}{" "}
                  <span className="font-normal text-neutral-500">
                    ({rental.legalCommitmentPct}%)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Legal commitment card ───────────────────────────────────────────── */}
      {legal && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                Legal commitment
              </CardTitle>
              <StatusBadge status={legal.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Contract version</p>
                <p className="font-semibold mt-1">{legal.contractVersion}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Commitment</p>
                <p className="font-semibold mt-1">
                  {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Signed date</p>
                <p className="font-semibold mt-1">
                  {legal.signedAt
                    ? new Date(legal.signedAt).toLocaleDateString()
                    : "Not yet signed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Sanad card ──────────────────────────────────────────────────────── */}
      {sanad && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Sanad (promissory note)
              </CardTitle>
              <StatusBadge status={sanad.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Nafith reference</p>
                <p className="font-mono mt-1">{sanad.nafithReference ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Principal</p>
                <p className="font-semibold mt-1">
                  {formatSar(sanad.principalHalalas)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Due amount</p>
                <p className="font-semibold mt-1">{formatSar(sanad.dueHalalas)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Maturity date</p>
                <p className="font-semibold mt-1">{sanad.maturityDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Payments list ───────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-500">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p: Payment) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      className={`${
                        PAYMENT_STATUS_COLOR[p.status] ?? "bg-neutral-100 text-neutral-700"
                      } border-0 shrink-0`}
                    >
                      {p.status}
                    </Badge>
                    <span className="text-neutral-600 capitalize">
                      {p.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Action buttons ──────────────────────────────────────────────────── */}

      {/* Sign contract */}
      {rental.status === "pending_legal_signing" && legal && (
        <Card className="mb-4 border-amber-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileSignature className="w-6 h-6 text-amber-600" />
              <div className="flex-1">
                <p className="font-semibold">Contract signing required</p>
                <p className="text-sm text-neutral-500">
                  Review and sign your legal commitment to proceed.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/legal/${legal.id}`)}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                Sign contract
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay now */}
      {rental.status === "pending_payment" && legal && (
        <Card className="mb-4 border-green-300 bg-green-50/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">Payment required</p>
                <p className="text-sm text-green-700">
                  Your contract is signed. Complete payment to confirm your rental.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/legal/${legal.id}`)}
                className="bg-neutral-900 hover:bg-neutral-800"
              >
                Pay {formatSar(rental.totalPayableHalalas)} now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel rental */}
      {canCancel && (
        <Card className="mb-4 border-red-200">
          <CardContent className="p-6">
            {!showCancelForm ? (
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-500" />
                <div className="flex-1">
                  <p className="font-semibold">Cancel this rental</p>
                  <p className="text-sm text-neutral-500">
                    You can cancel while the rental is still pending.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelForm(true)}
                >
                  Cancel rental
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <p className="font-semibold">Confirm cancellation</p>
                </div>
                <Textarea
                  placeholder="Please provide a reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                />
                {cancelMutation.error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {(cancelMutation.error as Error).message}
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                    }}
                  >
                    Go back
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={!cancelReason.trim() || cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate()}
                  >
                    {cancelMutation.isPending ? "Cancelling..." : "Confirm cancellation"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Open dispute */}
      {canDispute && (
        <Card className="mb-4 border-neutral-200">
          <CardContent className="p-6">
            {!showDisputeForm ? (
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-neutral-500" />
                <div className="flex-1">
                  <p className="font-semibold">Have an issue?</p>
                  <p className="text-sm text-neutral-500">
                    Open a dispute if something went wrong with this rental.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowDisputeForm(true)}>
                  Open dispute
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-neutral-700" />
                  <p className="font-semibold">Open a dispute</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1.5">Category</p>
                  <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damage">Damage</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="fraud">Fraud</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-neutral-600 mb-1.5">Summary</p>
                  <Textarea
                    placeholder="Describe the issue in detail..."
                    value={disputeSummary}
                    onChange={(e) => setDisputeSummary(e.target.value)}
                    rows={4}
                  />
                </div>
                {disputeMutation.error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {(disputeMutation.error as Error).message}
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisputeForm(false);
                      setDisputeCategory("");
                      setDisputeSummary("");
                    }}
                  >
                    Go back
                  </Button>
                  <Button
                    className="bg-neutral-900 hover:bg-neutral-800"
                    disabled={
                      !disputeCategory ||
                      !disputeSummary.trim() ||
                      disputeMutation.isPending
                    }
                    onClick={() => disputeMutation.mutate()}
                  >
                    {disputeMutation.isPending ? "Submitting..." : "Submit dispute"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
