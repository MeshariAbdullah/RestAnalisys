import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileSignature,
  CreditCard,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  ChevronRight,
  XCircle,
  Truck,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: typeof Clock; label: string }
> = {
  pending_risk_review: {
    color: "text-amber-800",
    bg: "bg-amber-100",
    icon: Clock,
    label: "Under risk review",
  },
  pending_legal_signing: {
    color: "text-purple-800",
    bg: "bg-purple-100",
    icon: FileSignature,
    label: "Awaiting your signature",
  },
  pending_payment: {
    color: "text-amber-800",
    bg: "bg-amber-100",
    icon: CreditCard,
    label: "Awaiting payment",
  },
  confirmed: {
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: CheckCircle,
    label: "Confirmed",
  },
  out_for_delivery: {
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: Truck,
    label: "Out for delivery",
  },
  active: {
    color: "text-green-700",
    bg: "bg-green-100",
    icon: CheckCircle,
    label: "Active — in your hands",
  },
  return_in_transit: {
    color: "text-amber-800",
    bg: "bg-amber-100",
    icon: Truck,
    label: "Return in transit",
  },
  under_inspection: {
    color: "text-amber-800",
    bg: "bg-amber-100",
    icon: Search,
    label: "Under return inspection",
  },
  closed: {
    color: "text-green-700",
    bg: "bg-green-100",
    icon: CheckCircle,
    label: "Closed",
  },
  closed_with_penalty: {
    color: "text-red-700",
    bg: "bg-red-100",
    icon: AlertCircle,
    label: "Closed with penalty",
  },
  in_dispute: {
    color: "text-red-700",
    bg: "bg-red-100",
    icon: AlertCircle,
    label: "In dispute",
  },
  enforcement: {
    color: "text-red-900",
    bg: "bg-red-200",
    icon: ShieldAlert,
    label: "Under enforcement",
  },
  cancelled: {
    color: "text-neutral-600",
    bg: "bg-neutral-200",
    icon: XCircle,
    label: "Cancelled",
  },
};

const LIFECYCLE_STEPS = [
  { key: "pending_legal_signing", label: "Sign contract" },
  { key: "pending_payment", label: "Pay" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "Shipping" },
  { key: "active", label: "Active" },
  { key: "under_inspection", label: "Inspection" },
  { key: "closed", label: "Closed" },
];

function stepIndex(status: string): number {
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  if (status === "closed_with_penalty" || status === "return_in_transit")
    return LIFECYCLE_STEPS.length - 1;
  return idx >= 0 ? idx : -1;
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
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
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      setShowCancel(false);
    } catch (err) {
      setError((err as Error).message ?? "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading || !data) {
    return <div className="p-8">Loading rental details...</div>;
  }

  const { rental, legal, sanad, payments: paymentList } = data;
  const config = STATUS_CONFIG[rental.status] ?? {
    color: "text-neutral-700",
    bg: "bg-neutral-200",
    icon: Clock,
    label: rental.status.replace(/_/g, " "),
  };
  const StatusIcon = config.icon;
  const currentStep = stepIndex(rental.status);
  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
        <a
          href="/my-rentals"
          className="hover:text-neutral-900 transition-colors"
        >
          My rentals
        </a>
        <ChevronRight className="w-3 h-3" />
        <span>{rental.reference}</span>
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Rental {rental.reference}</h1>
          <p className="text-neutral-500 mt-1">
            {rental.startDate} → {rental.endDate} ({rental.durationDays} days)
          </p>
        </div>
        <Badge className={`${config.bg} ${config.color} border-0 text-sm py-1`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {config.label}
        </Badge>
      </div>

      {/* Progress bar */}
      {currentStep >= 0 && rental.status !== "cancelled" && (
        <div className="mb-8">
          <div className="flex items-center gap-1">
            {LIFECYCLE_STEPS.map((step, i) => (
              <div key={step.key} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full h-1.5 rounded-full ${
                    i <= currentStep ? "bg-amber-500" : "bg-neutral-200"
                  }`}
                />
                <span
                  className={`text-[10px] mt-1.5 ${
                    i <= currentStep
                      ? "text-amber-700 font-medium"
                      : "text-neutral-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {/* Action cards based on status */}
      {rental.status === "pending_legal_signing" && legal && (
        <Card className="mb-6 border-purple-200 bg-purple-50/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <FileSignature className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-semibold text-purple-900">
                  Contract awaiting your signature
                </p>
                <p className="text-sm text-purple-700">
                  Review the legal commitment and sign via Nafath to proceed.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/legal/${legal.id}`)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white"
            >
              Review & sign contract
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {rental.status === "pending_payment" && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  Complete your payment
                </p>
                <p className="text-sm text-amber-700">
                  Your contract is signed. Pay{" "}
                  {formatSar(rental.totalPayableHalalas)} to confirm the rental.
                </p>
              </div>
            </div>
            <Button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {paying
                ? "Processing..."
                : `Pay ${formatSar(rental.totalPayableHalalas)}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {rental.status === "active" && (
        <Card className="mb-6 border-green-200 bg-green-50/40">
          <CardContent className="p-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                Rental is active
              </p>
              <p className="text-sm text-green-700">
                The item is with you. Return by {rental.endDate} to avoid late
                fees.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing breakdown */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Pricing</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">
                {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays}{" "}
                days
              </span>
              <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Platform fee</span>
              <span>{formatSar(rental.platformFeeHalalas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">VAT 15%</span>
              <span>{formatSar(rental.vatHalalas)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              Legal commitment
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-neutral-500 text-xs uppercase">Status</p>
                <p className="font-medium mt-0.5">
                  {legal.status.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">
                  Commitment
                </p>
                <p className="font-medium mt-0.5">
                  {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                </p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Version</p>
                <p className="font-medium mt-0.5">{legal.contractVersion}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Signed</p>
                <p className="font-medium mt-0.5">
                  {legal.signedAt
                    ? new Date(legal.signedAt).toLocaleDateString()
                    : "—"}
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
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Nafith Sanad (promissory note)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-neutral-500 text-xs uppercase">Status</p>
                <p className="font-medium mt-0.5">
                  {sanad.status.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Reference</p>
                <p className="font-mono font-medium mt-0.5">
                  {sanad.nafithReference ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Principal</p>
                <p className="font-medium mt-0.5">
                  {formatSar(sanad.principalHalalas)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Maturity</p>
                <p className="font-medium mt-0.5">{sanad.maturityDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      {paymentList.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </h2>
            <div className="space-y-3">
              {paymentList.map((p: Payment) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border-b last:border-0 pb-2"
                >
                  <div>
                    <span className="font-medium">
                      {p.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-neutral-500 ml-2">
                      via {p.gateway}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">
                      {formatSar(p.amountHalalas)}
                    </span>
                    <Badge
                      className={`ml-2 border-0 ${
                        p.status === "captured"
                          ? "bg-green-100 text-green-700"
                          : p.status === "refunded"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel */}
      {canCancel && (
        <div className="mt-6">
          {showCancel ? (
            <Card className="border-red-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-red-900 mb-3">
                  Cancel this rental
                </h3>
                <Textarea
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mb-3"
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancel(false)}
                    className="flex-1"
                  >
                    Keep rental
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={cancelling || !cancelReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white"
                  >
                    {cancelling ? "Cancelling..." : "Confirm cancellation"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowCancel(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Cancel rental
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
