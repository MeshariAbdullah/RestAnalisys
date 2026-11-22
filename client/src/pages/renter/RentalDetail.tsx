import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  FileSignature,
  Gavel,
  Package,
  Receipt,
  Shield,
  Truck,
  XCircle,
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

const LIFECYCLE_STEPS = [
  { key: "pending_legal_signing", label: "Contract", icon: FileSignature },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "out_for_delivery", label: "Shipping", icon: Truck },
  { key: "active", label: "In use", icon: Package },
  { key: "under_inspection", label: "Inspection", icon: Shield },
  { key: "closed", label: "Closed", icon: CheckCircle },
];

function stepIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "closed_with_penalty" || status === "enforcement") return 6;
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

const STATUS_COLOR: Record<string, string> = {
  pending_legal_signing: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-blue-100 text-blue-700",
  under_inspection: "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-700",
  closed_with_penalty: "bg-red-100 text-red-700",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-200 text-neutral-600",
};

const CANCELLABLE = [
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
];

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

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
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, "Cancelled by renter");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
    } catch (err) {
      setError((err as Error).message ?? "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading rental…</div>;
  }
  if (!data) {
    return <div className="p-8">Rental not found.</div>;
  }

  const { rental, legal, sanad, payments: paymentsList } = data;
  const current = stepIndex(rental.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge
          className={`text-sm px-3 py-1 ${STATUS_COLOR[rental.status] ?? "bg-neutral-200 text-neutral-700"} border-0`}
        >
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Timeline stepper */}
      {rental.status !== "cancelled" && (
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center min-w-[600px]">
            {LIFECYCLE_STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i <= current;
              const active = i === current;
              return (
                <React.Fragment key={step.key}>
                  {i > 0 && (
                    <div
                      className={`flex-1 h-0.5 ${done ? "bg-amber-500" : "bg-neutral-200"}`}
                    />
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        active
                          ? "bg-amber-500 text-neutral-950"
                          : done
                            ? "bg-amber-100 text-amber-700"
                            : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[11px] whitespace-nowrap ${active ? "font-semibold text-amber-700" : "text-neutral-500"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {rental.status === "cancelled" && (
        <div className="mb-8 flex items-center gap-3 p-4 rounded-lg bg-neutral-100 text-neutral-600">
          <XCircle className="w-5 h-5" />
          <span className="text-sm">This rental was cancelled.</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pricing breakdown */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Pricing breakdown
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Period</span>
                <span>
                  {rental.startDate} → {rental.endDate} ({rental.durationDays}{" "}
                  days)
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>
                  {formatSar(rental.dailyPriceHalalas)} / day ×{" "}
                  {rental.durationDays}
                </span>
                <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Platform fee</span>
                <span>{formatSar(rental.platformFeeHalalas)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>VAT 15%</span>
                <span>{formatSar(rental.vatHalalas)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-3 border-t">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileSignature className="w-4 h-4" /> Legal commitment
            </h2>
            {legal ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge
                    variant="outline"
                    className={
                      legal.status === "signed"
                        ? "border-green-300 text-green-700"
                        : ""
                    }
                  >
                    {legal.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Commitment amount</span>
                  <span className="font-semibold">
                    {formatSar(legal.commitmentHalalas)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>% of evaluated value</span>
                  <span>{legal.commitmentPct}%</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Contract version</span>
                  <span>{legal.contractVersion}</span>
                </div>
                {legal.signedAt && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Signed at</span>
                    <span>{new Date(legal.signedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No legal commitment on record.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sanad info */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Gavel className="w-4 h-4" /> Nafith Sanad
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge variant="outline">
                    {sanad.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {sanad.nafithReference && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Nafith reference</span>
                    <span className="font-mono text-xs">
                      {sanad.nafithReference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Principal</span>
                  <span>{formatSar(sanad.principalHalalas)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Amount due</span>
                  <span className="font-semibold">
                    {formatSar(sanad.dueHalalas)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Maturity date</span>
                  <span>{sanad.maturityDate}</span>
                </div>
                {sanad.executionCaseNumber && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Najiz case #</span>
                    <span className="font-mono text-xs">
                      {sanad.executionCaseNumber}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment history */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payments
            </h2>
            {paymentsList.length > 0 ? (
              <div className="space-y-3">
                {paymentsList.map((p: Payment) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b border-neutral-100 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {p.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString()} ·{" "}
                        {p.gateway}
                        {p.invoiceNumber ? ` · ${p.invoiceNumber}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatSar(p.amountHalalas)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          p.status === "captured"
                            ? "border-green-300 text-green-700"
                            : p.status === "failed"
                              ? "border-red-300 text-red-700"
                              : ""
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No payments yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        {rental.status === "pending_legal_signing" && legal && (
          <Link href={`/legal/${legal.id}`}>
            <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
              <FileSignature className="w-4 h-4 mr-2" />
              Review & sign contract
            </Button>
          </Link>
        )}

        {rental.status === "pending_payment" && (
          <Button
            onClick={handlePay}
            disabled={paying}
            className="bg-neutral-900 hover:bg-neutral-800"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {paying
              ? "Processing…"
              : `Pay ${formatSar(rental.totalPayableHalalas)} now`}
          </Button>
        )}

        {CANCELLABLE.includes(rental.status) && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={cancelling}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {cancelling ? "Cancelling…" : "Cancel rental"}
          </Button>
        )}
      </div>
    </div>
  );
}
