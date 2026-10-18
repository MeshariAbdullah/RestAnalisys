import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar, type Payment } from "@/lib/api";
import { Link } from "wouter";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
]);

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

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    captured: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-800",
    refunded: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <Badge className={`${colors[status] ?? "bg-neutral-200 text-neutral-700"} hover:${colors[status] ?? "bg-neutral-200"} border-0 text-xs`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setActionError(null);
    try {
      await rentalsApi.cancel(id, cancelReason.trim());
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      setShowCancelForm(false);
      setCancelReason("");
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading...</div>;

  const { rental, legal, sanad, payments } = data;
  const canCancel = CANCELLABLE_STATUSES.has(rental.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/my-rentals" className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to my rentals
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
            <h1 className="text-3xl font-bold mt-1">Rental details</h1>
          </div>
          <StatusBadge status={rental.status} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          {/* Dates & Duration */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-neutral-500" />
                <h2 className="font-semibold">Dates & duration</h2>
              </div>
              <div className="space-y-3 text-sm">
                <Row label="Start date" value={rental.startDate} />
                <Row label="End date" value={rental.endDate} />
                <Row label="Duration" value={`${rental.durationDays} days`} />
                {rental.confirmedAt && <Row label="Confirmed" value={new Date(rental.confirmedAt).toLocaleDateString()} />}
                {rental.deliveredAt && <Row label="Delivered" value={new Date(rental.deliveredAt).toLocaleDateString()} />}
                {rental.returnedAt && <Row label="Returned" value={new Date(rental.returnedAt).toLocaleDateString()} />}
                {rental.closedAt && <Row label="Closed" value={new Date(rental.closedAt).toLocaleDateString()} />}
              </div>
            </CardContent>
          </Card>

          {/* Legal Commitment */}
          {legal && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-neutral-500" />
                  <h2 className="font-semibold">Legal commitment</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <Row label="Commitment amount" value={formatSar(legal.commitmentHalalas)} />
                  <Row label="Commitment percentage" value={`${legal.commitmentPct}%`} />
                  <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                  <Row label="Contract version" value={legal.contractVersion} />
                  {legal.signedAt && (
                    <Row label="Signed date" value={new Date(legal.signedAt).toLocaleDateString()} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sanad */}
          {sanad && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-neutral-500" />
                  <h2 className="font-semibold">Sanad (promissory note)</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                  {sanad.nafithReference && <Row label="Nafith reference" value={sanad.nafithReference} />}
                  <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                  <Row label="Maturity date" value={sanad.maturityDate} />
                  {sanad.executionCaseNumber && (
                    <Row label="Execution case" value={sanad.executionCaseNumber} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-neutral-500" />
                  <h2 className="font-semibold">Payments</h2>
                </div>
                <div className="space-y-3">
                  {payments.map((p: Payment) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium capitalize">{p.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                          {p.invoiceNumber && ` - ${p.invoiceNumber}`}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="font-semibold">{formatSar(p.amountHalalas)}</span>
                        <PaymentStatusBadge status={p.status} />
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
          {/* Pricing Breakdown */}
          <Card>
            <CardContent className="p-6 space-y-3 text-sm">
              <h2 className="font-semibold mb-2">Pricing breakdown</h2>
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label={`Subtotal (${rental.durationDays} days)`} value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT" value={formatSar(rental.vatHalalas)} />
              <div className="border-t border-neutral-200 pt-3 mt-3">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatSar(rental.totalPayableHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancel button */}
          {canCancel && !showCancelForm && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancelForm(true)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancel rental
            </Button>
          )}

          {showCancelForm && (
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-red-900 mb-3">Cancel this rental?</p>
                <textarea
                  className="w-full rounded border border-red-200 p-2 text-sm mb-3 bg-white"
                  rows={3}
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleCancel}
                    disabled={cancelling || !cancelReason.trim()}
                  >
                    {cancelling ? "Cancelling..." : "Confirm cancel"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCancelForm(false);
                      setCancelReason("");
                      setActionError(null);
                    }}
                  >
                    Keep rental
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
