import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  Package,
  Shield,
  Truck,
  XCircle,
  AlertTriangle,
  Receipt,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  rentalsApi,
  assetsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending_risk_review: { label: "Risk Review", color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { label: "Awaiting Signature", color: "bg-amber-100 text-amber-800", icon: FileSignature },
  pending_payment: { label: "Awaiting Payment", color: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  out_for_delivery: { label: "Out for Delivery", color: "bg-blue-100 text-blue-700", icon: Truck },
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: Package },
  return_in_transit: { label: "Return in Transit", color: "bg-amber-100 text-amber-800", icon: Truck },
  under_inspection: { label: "Under Inspection", color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  closed_with_penalty: { label: "Closed (Penalty)", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  in_dispute: { label: "In Dispute", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  enforcement: { label: "Enforcement", color: "bg-red-100 text-red-700", icon: Shield },
  cancelled: { label: "Cancelled", color: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

const TIMELINE_STEPS = [
  { key: "created", label: "Created" },
  { key: "signed", label: "Contract Signed" },
  { key: "paid", label: "Payment" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
  { key: "closed", label: "Closed" },
];

function getTimelineProgress(rental: Rental): number {
  if (["closed", "closed_with_penalty"].includes(rental.status)) return 6;
  if (["under_inspection"].includes(rental.status)) return 5;
  if (["return_in_transit"].includes(rental.status)) return 5;
  if (["active"].includes(rental.status)) return 4;
  if (["out_for_delivery"].includes(rental.status)) return 4;
  if (["confirmed"].includes(rental.status)) return 3;
  if (["pending_payment"].includes(rental.status)) return 2;
  if (["pending_legal_signing"].includes(rental.status)) return 1;
  if (["cancelled"].includes(rental.status)) return -1;
  return 1;
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental-detail", id],
    queryFn: () => rentalsApi.get(id),
  });

  const assetQuery = useQuery({
    queryKey: ["asset-for-rental", data?.rental.assetId],
    queryFn: () => assetsApi.get(data!.rental.assetId),
    enabled: !!data?.rental.assetId,
  });

  async function handleCancel() {
    if (!cancelReason.trim() || cancelReason.length < 3) {
      setError("Please provide a reason (at least 3 characters)");
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rental-detail", id] });
      setShowCancel(false);
    } catch (err) {
      setError((err as Error).message ?? "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded mb-6" />
        <div className="h-64 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20">
        <p className="text-neutral-500">Rental not found.</p>
        <Link href="/my-rentals">
          <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
            Back to My Rentals
          </a>
        </Link>
      </div>
    );
  }

  const { rental, legal, sanad, payments: paymentsList } = data;
  const asset = assetQuery.data;
  const statusConf = STATUS_CONFIG[rental.status] ?? STATUS_CONFIG.pending_risk_review;
  const StatusIcon = statusConf.icon;
  const progress = getTimelineProgress(rental);
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(rental.status);
  const needsSign = rental.status === "pending_legal_signing" && legal;
  const needsPay = rental.status === "pending_payment";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to My Rentals
        </a>
      </Link>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">
            {asset?.title ?? `Rental #${rental.id}`}
          </h1>
          {asset && (
            <p className="text-neutral-500 mt-1">
              {asset.brand} {asset.model ? `· ${asset.model}` : ""}
            </p>
          )}
        </div>
        <Badge className={`${statusConf.color} border-0 text-sm px-3 py-1.5`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {statusConf.label}
        </Badge>
      </div>

      {/* Timeline */}
      {rental.status !== "cancelled" && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const completed = i < progress;
                const current = i === progress - 1;
                return (
                  <React.Fragment key={step.key}>
                    {i > 0 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          completed ? "bg-amber-500" : "bg-neutral-200"
                        }`}
                      />
                    )}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          completed
                            ? "bg-amber-500 text-white"
                            : current
                              ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500"
                              : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`text-[11px] whitespace-nowrap ${
                          completed || current
                            ? "text-neutral-900 font-medium"
                            : "text-neutral-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action cards */}
      {needsSign && (
        <Card className="mb-6 border-amber-300 bg-amber-50/40">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSignature className="w-8 h-8 text-amber-600" />
              <div>
                <p className="font-semibold">Sign your contract</p>
                <p className="text-sm text-neutral-600">
                  Review and sign the legal commitment to proceed with payment.
                </p>
              </div>
            </div>
            <Link href={`/legal/${legal.id}`}>
              <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400 shrink-0">
                Review & Sign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {needsPay && (
        <Card className="mb-6 border-green-300 bg-green-50/40">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold">Complete your payment</p>
                <p className="text-sm text-neutral-600">
                  Contract signed. Pay {formatSar(rental.totalPayableHalalas)} to confirm your rental.
                </p>
              </div>
            </div>
            {legal && (
              <Link href={`/legal/${legal.id}`}>
                <Button className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                  Pay Now
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Rental info */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neutral-400" />
                Rental Details
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Start date" value={rental.startDate} />
                <InfoRow label="End date" value={rental.endDate} />
                <InfoRow label="Duration" value={`${rental.durationDays} days`} />
                <InfoRow
                  label="Delivered"
                  value={
                    rental.deliveredAt
                      ? new Date(rental.deliveredAt).toLocaleDateString("en-SA")
                      : "—"
                  }
                />
                <InfoRow
                  label="Returned"
                  value={
                    rental.returnedAt
                      ? new Date(rental.returnedAt).toLocaleDateString("en-SA")
                      : "—"
                  }
                />
                <InfoRow
                  label="Closed"
                  value={
                    rental.closedAt
                      ? new Date(rental.closedAt).toLocaleDateString("en-SA")
                      : "—"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing breakdown */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-neutral-400" />
                Pricing Breakdown
              </h2>
              <div className="space-y-2 text-sm">
                <PriceRow
                  label={`${formatSar(rental.dailyPriceHalalas)} x ${rental.durationDays} days`}
                  value={formatSar(rental.rentalSubtotalHalalas)}
                />
                <PriceRow
                  label="Platform fee"
                  value={formatSar(rental.platformFeeHalalas)}
                />
                <PriceRow
                  label="VAT (15%)"
                  value={formatSar(rental.vatHalalas)}
                />
                <div className="border-t pt-2 mt-2">
                  <PriceRow
                    label="Total"
                    value={formatSar(rental.totalPayableHalalas)}
                    bold
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          {paymentsList.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-neutral-400" />
                  Payments
                </h2>
                <div className="space-y-3">
                  {paymentsList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`border-0 text-xs ${
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "refunded"
                                ? "bg-amber-100 text-amber-700"
                                : p.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {p.status}
                        </Badge>
                        <span className="text-neutral-600 capitalize">
                          {p.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                        <p className="text-[11px] text-neutral-400">
                          {new Date(p.createdAt).toLocaleDateString("en-SA")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Legal commitment */}
          {legal && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-neutral-400" />
                  Legal Commitment
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Status</span>
                    <Badge
                      className={`border-0 text-xs ${
                        legal.status === "signed"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {legal.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Commitment</span>
                    <span className="font-medium">
                      {formatSar(legal.commitmentHalalas)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Rate</span>
                    <span className="font-medium">{legal.commitmentPct}%</span>
                  </div>
                  {legal.signedAt && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Signed</span>
                      <span className="text-xs">
                        {new Date(legal.signedAt).toLocaleDateString("en-SA")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sanad */}
          {sanad && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neutral-400" />
                  Sanad (Promissory Note)
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Status</span>
                    <Badge className="border-0 text-xs bg-neutral-100">
                      {sanad.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Principal</span>
                    <span className="font-medium">
                      {formatSar(sanad.principalHalalas)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Maturity</span>
                    <span className="text-xs">{sanad.maturityDate}</span>
                  </div>
                  {sanad.nafithReference && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Nafith Ref</span>
                      <span className="font-mono text-xs">
                        {sanad.nafithReference}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk snapshot */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-400" />
                Risk Assessment
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Trust score</span>
                  <span className="font-medium">
                    {rental.trustScoreAtBooking ?? "—"}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Commitment %</span>
                  <span className="font-medium">{rental.legalCommitmentPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total commitment</span>
                  <span className="font-medium">
                    {formatSar(rental.legalCommitmentHalalas)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancel */}
          {canCancel && !showCancel && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancel(true)}
            >
              <Ban className="w-4 h-4 mr-1.5" />
              Cancel Rental
            </Button>
          )}

          {showCancel && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  Cancel this rental?
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  className="w-full border rounded-lg p-2 text-sm mb-3 min-h-[80px] resize-none"
                />
                {error && (
                  <p className="text-xs text-red-600 mb-2">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCancel(false);
                      setError(null);
                    }}
                  >
                    Keep
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling…" : "Confirm Cancel"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500 text-xs uppercase">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

function PriceRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-semibold" : "text-neutral-600"}>
        {label}
      </span>
      <span className={bold ? "font-bold text-base" : ""}>{value}</span>
    </div>
  );
}
