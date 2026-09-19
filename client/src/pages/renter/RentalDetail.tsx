import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  FileSignature,
  ShieldCheck,
  CreditCard,
  XCircle,
  Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  rentalsApi,
  paymentsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Status metadata (mirrors MyRentals.tsx)
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: {
    color: "bg-amber-100 text-amber-800",
    icon: FileSignature,
  },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { color: "bg-neutral-200 text-neutral-700", icon: Clock };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
]);

// ---------------------------------------------------------------------------
// Payment status helpers
// ---------------------------------------------------------------------------

function paymentStatusColor(status: string): string {
  switch (status) {
    case "captured":
    case "settled":
      return "bg-green-100 text-green-700";
    case "pending":
    case "authorized":
      return "bg-amber-100 text-amber-800";
    case "failed":
    case "refunded":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-200 text-neutral-700";
  }
}

// ---------------------------------------------------------------------------
// Sanad status helpers
// ---------------------------------------------------------------------------

function sanadStatusColor(status: string): string {
  switch (status) {
    case "active":
    case "issued":
      return "bg-blue-100 text-blue-700";
    case "discharged":
      return "bg-green-100 text-green-700";
    case "under_execution":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-200 text-neutral-700";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      await paymentsApi.charge(id);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setError((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason.trim());
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      setShowCancelDialog(false);
      setCancelReason("");
    } catch (err) {
      setError((err as Error).message ?? "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <p className="text-neutral-500">Rental not found.</p>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const isCancellable = CANCELLABLE_STATUSES.has(rental.status);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to my rentals
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">
            {rental.reference}
          </p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Summary card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Period</p>
              <p className="font-semibold mt-1 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-neutral-400" />
                {rental.startDate} - {rental.endDate}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {rental.durationDays} days
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Daily rate</p>
              <p className="font-semibold mt-1">
                {formatSar(rental.dailyPriceHalalas)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Commitment</p>
              <p className="font-semibold mt-1">
                {formatSar(rental.legalCommitmentHalalas)}
              </p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {rental.legalCommitmentPct}% of value
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Total payable</p>
              <p className="font-bold text-xl mt-1">
                {formatSar(rental.totalPayableHalalas)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing breakdown */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Pricing breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>
                {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays}{" "}
                days
              </span>
              <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Platform fee</span>
              <span>{formatSar(rental.platformFeeHalalas)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>VAT (15%)</span>
              <span>{formatSar(rental.vatHalalas)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-3 border-t">
              <span>Total</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Legal, Sanad, Payments */}
      <Tabs defaultValue="legal" className="mb-6">
        <TabsList>
          <TabsTrigger value="legal" className="gap-1.5">
            <FileSignature className="w-3.5 h-3.5" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="sanad" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sanad
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Payments
            {payments.length > 0 && (
              <span className="ml-1 text-[10px] bg-neutral-200 text-neutral-700 rounded-full px-1.5">
                {payments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Legal tab ────────────────────────────────────────────────── */}
        <TabsContent value="legal">
          {legal ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Legal commitment</h3>
                  <Badge
                    className={`border-0 ${
                      legal.status === "signed"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {legal.status === "signed" ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {legal.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">
                      Contract version
                    </p>
                    <p className="font-medium mt-1">{legal.contractVersion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">
                      Commitment amount
                    </p>
                    <p className="font-medium mt-1">
                      {formatSar(legal.commitmentHalalas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">
                      Commitment %
                    </p>
                    <p className="font-medium mt-1">{legal.commitmentPct}%</p>
                  </div>
                </div>

                {legal.signedAt && (
                  <p className="text-xs text-neutral-500 mb-4">
                    Signed on {legal.signedAt}
                  </p>
                )}

                {/* Clauses */}
                {legal.clausesJson.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-4 bg-neutral-50">
                    <p className="text-xs font-semibold uppercase text-neutral-500">
                      Contract clauses
                    </p>
                    {legal.clausesJson.map((clause, i) => (
                      <div key={clause.id} className="text-sm">
                        <p className="font-medium">
                          {i + 1}. {clause.titleEn}
                        </p>
                        <p className="text-neutral-600 mt-0.5 leading-relaxed">
                          {clause.bodyEn}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-neutral-500">
                <FileSignature className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                <p>No legal commitment for this rental.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Sanad tab ────────────────────────────────────────────────── */}
        <TabsContent value="sanad">
          {sanad ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Sanad (promissory note)</h3>
                  <Badge
                    className={`border-0 ${sanadStatusColor(sanad.status)}`}
                  >
                    {sanad.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  {sanad.nafithReference && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase">
                        Nafith reference
                      </p>
                      <p className="font-mono font-medium mt-1">
                        {sanad.nafithReference}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">
                      Principal
                    </p>
                    <p className="font-medium mt-1">
                      {formatSar(sanad.principalHalalas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">
                      Amount due
                    </p>
                    <p className="font-medium mt-1">
                      {formatSar(sanad.dueHalalas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">
                      Maturity date
                    </p>
                    <p className="font-medium mt-1">{sanad.maturityDate}</p>
                  </div>
                </div>

                {sanad.executionCaseNumber && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <p className="font-medium text-red-800">
                      Execution case: {sanad.executionCaseNumber}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-neutral-500">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                <p>No Sanad issued for this rental yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Payments tab ─────────────────────────────────────────────── */}
        <TabsContent value="payments">
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((p: Payment) => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {p.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {p.gateway}
                          {p.invoiceNumber && ` - ${p.invoiceNumber}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`border-0 ${paymentStatusColor(p.status)}`}
                      >
                        {p.status}
                      </Badge>
                      <p className="font-semibold text-sm">
                        {formatSar(p.amountHalalas)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-neutral-500">
                <CreditCard className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                <p>No payments recorded yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Key dates */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Timeline</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Created</p>
              <p className="font-medium mt-1">{rental.createdAt}</p>
            </div>
            {rental.confirmedAt && (
              <div>
                <p className="text-xs text-neutral-500 uppercase">Confirmed</p>
                <p className="font-medium mt-1">{rental.confirmedAt}</p>
              </div>
            )}
            {rental.deliveredAt && (
              <div>
                <p className="text-xs text-neutral-500 uppercase">Delivered</p>
                <p className="font-medium mt-1">{rental.deliveredAt}</p>
              </div>
            )}
            {rental.returnedAt && (
              <div>
                <p className="text-xs text-neutral-500 uppercase">Returned</p>
                <p className="font-medium mt-1">{rental.returnedAt}</p>
              </div>
            )}
            {rental.closedAt && (
              <div>
                <p className="text-xs text-neutral-500 uppercase">Closed</p>
                <p className="font-medium mt-1">{rental.closedAt}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {(rental.status === "pending_legal_signing" ||
        rental.status === "pending_payment" ||
        isCancellable) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6 flex flex-wrap gap-3">
            {rental.status === "pending_legal_signing" && legal && (
              <Button
                onClick={() => navigate(`/legal/${legal.id}`)}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Sign Contract
              </Button>
            )}

            {rental.status === "pending_payment" && (
              <Button
                onClick={handlePay}
                disabled={paying}
                className="bg-neutral-900 hover:bg-neutral-800"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {paying ? "Processing..." : "Pay Now"}
              </Button>
            )}

            {isCancellable && (
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Rental
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel dialog (overlay) */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md mx-4 shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-1">Cancel rental</h3>
              <p className="text-sm text-neutral-500 mb-4">
                This action cannot be undone. Please provide a reason.
              </p>

              <Label htmlFor="cancel-reason" className="text-sm">
                Reason for cancellation
              </Label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling this rental?"
                rows={3}
                className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              {error && (
                <p className="mt-3 text-sm text-red-700">{error}</p>
              )}

              <div className="flex justify-end gap-3 mt-5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelReason("");
                    setError(null);
                  }}
                  disabled={cancelling}
                >
                  Keep rental
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={cancelling || !cancelReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {cancelling ? "Cancelling..." : "Confirm cancellation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
