import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileSignature,
  CreditCard,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  Shield,
  XCircle,
  Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, paymentsApi, formatSar, type Rental, type LegalCommitment, type SanadRecord, type Payment } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const STATUS_ORDER = [
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
  "confirmed",
  "out_for_delivery",
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
];

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending_risk_review: { label: "Risk Review", icon: Clock, color: "text-neutral-400" },
  pending_legal_signing: { label: "Awaiting Signature", icon: FileSignature, color: "text-amber-500" },
  pending_payment: { label: "Awaiting Payment", icon: CreditCard, color: "text-amber-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "text-blue-500" },
  out_for_delivery: { label: "Out for Delivery", icon: Truck, color: "text-blue-500" },
  active: { label: "With You", icon: Package, color: "text-green-500" },
  return_in_transit: { label: "Return in Transit", icon: Truck, color: "text-amber-500" },
  under_inspection: { label: "Under Inspection", icon: Shield, color: "text-amber-500" },
  closed: { label: "Closed", icon: CheckCircle, color: "text-green-600" },
  closed_with_penalty: { label: "Closed (Penalty)", icon: AlertCircle, color: "text-orange-500" },
  in_dispute: { label: "In Dispute", icon: AlertCircle, color: "text-red-500" },
  enforcement: { label: "Enforcement", icon: AlertCircle, color: "text-red-600" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-neutral-500" },
};

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const isBadClose = ["closed_with_penalty", "in_dispute", "enforcement"].includes(currentStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_ORDER.map((s, i) => {
        const meta = STATUS_META[s];
        const isActive = s === currentStatus;
        const isPast = currentIdx >= 0 && i < currentIdx;
        const Icon = meta.icon;

        return (
          <React.Fragment key={s}>
            {i > 0 && (
              <div
                className={`h-0.5 w-6 shrink-0 ${
                  isPast ? "bg-green-400" : "bg-neutral-200"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-neutral-900 text-white font-medium"
                  : isPast
                  ? "text-green-600"
                  : "text-neutral-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
            </div>
          </React.Fragment>
        );
      })}
      {(isCancelled || isBadClose) && (
        <>
          <div className="h-0.5 w-6 shrink-0 bg-red-200" />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs whitespace-nowrap shrink-0 bg-red-100 text-red-700 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {STATUS_META[currentStatus]?.label ?? currentStatus}
          </div>
        </>
      )}
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handlePay() {
    setPaying(true);
    try {
      await paymentsApi.charge(id);
      toast("success", "Payment captured successfully");
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast("error", (err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await rentalsApi.cancel(id, "Cancelled by renter");
      toast("success", "Rental cancelled");
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast("error", (err as Error).message ?? "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-96 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20 text-neutral-500">
        Rental not found or you don't have access.
      </div>
    );
  }

  const { rental, legal, sanad, payments: paymentsList } = data;
  const meta = STATUS_META[rental.status] ?? STATUS_META.pending_risk_review;
  const StatusIcon = meta.icon;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Rentals
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <div className={`flex items-center gap-2 text-lg font-semibold ${meta.color}`}>
          <StatusIcon className="w-5 h-5" />
          {meta.label}
        </div>
      </div>

      {/* Status timeline */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <StatusTimeline currentStatus={rental.status} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="md:col-span-2 space-y-6">
          {/* Pricing */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Pricing Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">
                    {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays} days
                  </span>
                  <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Platform fee</span>
                  <span>{formatSar(rental.platformFeeHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">VAT (15%)</span>
                  <span>{formatSar(rental.vatHalalas)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-3 border-t">
                  <span>Total</span>
                  <span>{formatSar(rental.totalPayableHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Rental Period</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Start</p>
                  <p className="font-medium mt-1">{rental.startDate}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">End</p>
                  <p className="font-medium mt-1">{rental.endDate}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Duration</p>
                  <p className="font-medium mt-1">{rental.durationDays} days</p>
                </div>
              </div>
              {rental.confirmedAt && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                  {rental.confirmedAt && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase">Confirmed</p>
                      <p className="font-medium mt-1">
                        {new Date(rental.confirmedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {rental.deliveredAt && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase">Delivered</p>
                      <p className="font-medium mt-1">
                        {new Date(rental.deliveredAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {rental.returnedAt && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase">Returned</p>
                      <p className="font-medium mt-1">
                        {new Date(rental.returnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          {paymentsList.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payments
                </h3>
                <div className="space-y-3">
                  {paymentsList.map((p: Payment) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {p.type.replace("_", " ")}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {p.gateway} · {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                        <Badge
                          className={
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }
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
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Actions */}
          {rental.status === "pending_legal_signing" && legal && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-5">
                <h4 className="font-semibold text-amber-900 mb-2">
                  Sign your contract
                </h4>
                <p className="text-sm text-amber-800 mb-4">
                  Review and sign the legal commitment via Nafath to proceed.
                </p>
                <Link href={`/legal/${legal.id}`}>
                  <Button className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400">
                    <FileSignature className="w-4 h-4 mr-2" />
                    Review & Sign
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {rental.status === "pending_payment" && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Complete payment
                </h4>
                <p className="text-sm text-blue-800 mb-2">
                  Total: <strong>{formatSar(rental.totalPayableHalalas)}</strong>
                </p>
                <Button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {paying ? "Processing..." : "Pay Now"}
                </Button>
              </CardContent>
            </Card>
          )}

          {["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(
            rental.status
          ) && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Rental"}
            </Button>
          )}

          {/* Legal commitment */}
          {legal && (
            <Card>
              <CardContent className="p-5">
                <h4 className="text-xs text-neutral-500 uppercase mb-3">
                  Legal Commitment
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Status</span>
                    <Badge
                      className={
                        legal.status === "signed"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {legal.status}
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
                      <span className="font-medium">
                        {new Date(legal.signedAt).toLocaleDateString()}
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
              <CardContent className="p-5">
                <h4 className="text-xs text-neutral-500 uppercase mb-3">
                  Nafith Sanad
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Status</span>
                    <Badge
                      className={
                        sanad.status === "signed" || sanad.status === "active"
                          ? "bg-green-100 text-green-700"
                          : sanad.status === "under_execution"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {sanad.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {sanad.nafithReference && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Reference</span>
                      <span className="font-mono text-xs">{sanad.nafithReference}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Principal</span>
                    <span className="font-medium">
                      {formatSar(sanad.principalHalalas)}
                    </span>
                  </div>
                  {sanad.maturityDate && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Maturity</span>
                      <span className="font-medium">{sanad.maturityDate}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk snapshot */}
          {rental.trustScoreAtBooking != null && (
            <Card>
              <CardContent className="p-5">
                <h4 className="text-xs text-neutral-500 uppercase mb-3">
                  Risk Snapshot
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Trust score at booking</span>
                    <span className="font-medium">{rental.trustScoreAtBooking}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Commitment level</span>
                    <span className="font-medium">{rental.legalCommitmentPct}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
