import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  FileText,
  CreditCard,
  Shield,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  rentalsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

// ─── Status badge (reused from MyRentals) ────────────────────────────────────

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
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
  closed_with_major_damage: {
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  closed_with_loss: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-200 text-red-800", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
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

// ─── Cancellable statuses ────────────────────────────────────────────────────

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
]);

// ─── Payment status badge ────────────────────────────────────────────────────

const PAYMENT_STATUS_META: Record<string, string> = {
  captured: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-800",
  refunded: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RentalDetail({ rentalId }: { rentalId: number }) {
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => rentalsApi.cancel(rentalId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", rentalId] });
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowCancelForm(false);
      setCancelReason("");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded bg-neutral-100 animate-pulse" />
        <div className="h-48 rounded-xl bg-neutral-100 animate-pulse" />
        <div className="h-36 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>Failed to load rental details.</p>
            <a
              href="/my-rentals"
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Back to my rentals
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <a
        href="/my-rentals"
        className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to my rentals
      </a>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-xs text-neutral-500">
            {rental.reference}
          </p>
          <h1 className="text-2xl font-bold mt-1">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Date range & duration */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h2 className="font-semibold">Period</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Start date</p>
              <p className="font-medium">{rental.startDate}</p>
            </div>
            <div>
              <p className="text-neutral-500">End date</p>
              <p className="font-medium">{rental.endDate}</p>
            </div>
            <div>
              <p className="text-neutral-500">Duration</p>
              <p className="font-medium">{rental.durationDays} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial breakdown */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-neutral-400" />
            <h2 className="font-semibold">Financial breakdown</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">
                Daily rate x {rental.durationDays} days
              </span>
              <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Platform fee</span>
              <span>{formatSar(rental.platformFeeHalalas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">VAT</span>
              <span>{formatSar(rental.vatHalalas)}</span>
            </div>
            <hr className="border-neutral-200" />
            <div className="flex justify-between font-bold text-base">
              <span>Total payable</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-neutral-400" />
              <h2 className="font-semibold">Legal commitment</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Status</p>
                <StatusBadge status={legal.status} />
              </div>
              <div>
                <p className="text-neutral-500">Commitment amount</p>
                <p className="font-medium">
                  {formatSar(legal.commitmentHalalas)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Commitment percentage</p>
                <p className="font-medium">{legal.commitmentPct}%</p>
              </div>
              <div>
                <p className="text-neutral-500">Signed date</p>
                <p className="font-medium">
                  {legal.signedAt
                    ? new Date(legal.signedAt).toLocaleDateString()
                    : "Not yet signed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-neutral-400" />
              <h2 className="font-semibold">Sanad</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Status</p>
                <StatusBadge status={sanad.status} />
              </div>
              <div>
                <p className="text-neutral-500">Nafith reference</p>
                <p className="font-medium font-mono">
                  {sanad.nafithReference ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Principal</p>
                <p className="font-medium">
                  {formatSar(sanad.principalHalalas)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Maturity date</p>
                <p className="font-medium">{sanad.maturityDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-neutral-400" />
              <h2 className="font-semibold">Payments</h2>
            </div>
            <div className="space-y-3">
              {payments.map((p: Payment) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500 capitalize">
                      {p.type.replace(/_/g, " ")}
                    </span>
                    <Badge
                      className={`${
                        PAYMENT_STATUS_META[p.status] ??
                        "bg-neutral-200 text-neutral-700"
                      } hover:${
                        PAYMENT_STATUS_META[p.status] ??
                        "bg-neutral-200 text-neutral-700"
                      } border-0 text-xs`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatSar(p.amountHalalas)}</p>
                    <p className="text-xs text-neutral-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel action */}
      {CANCELLABLE_STATUSES.has(rental.status) && (
        <Card>
          <CardContent className="p-6">
            {!showCancelForm ? (
              <Button
                variant="destructive"
                onClick={() => setShowCancelForm(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel rental
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">
                  Please provide a reason for cancellation:
                </p>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                />
                {cancelMutation.isError && (
                  <p className="text-sm text-red-600">
                    {(cancelMutation.error as Error).message}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    disabled={
                      !cancelReason.trim() || cancelMutation.isPending
                    }
                    onClick={() => cancelMutation.mutate(cancelReason.trim())}
                  >
                    {cancelMutation.isPending
                      ? "Cancelling..."
                      : "Confirm cancellation"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                    }}
                  >
                    Keep rental
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
