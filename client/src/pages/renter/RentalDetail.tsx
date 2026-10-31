import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Package,
  Shield,
  Truck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  rentalsApi,
  paymentsApi,
  legalApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { getRentalStatusLabel } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STATUS_STEPS = [
  { key: "pending_legal_signing", label: "Sign Contract", icon: FileText },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "out_for_delivery", label: "Shipping", icon: Truck },
  { key: "active", label: "In Use", icon: Package },
  { key: "under_inspection", label: "Return Inspection", icon: Shield },
  { key: "closed", label: "Completed", icon: CheckCircle },
];

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (status === "closed" || status === "closed_with_penalty") return STATUS_STEPS.length - 1;
  if (status === "return_in_transit") return 4;
  return idx >= 0 ? idx : -1;
}

function StatusTimeline({ status }: { status: string }) {
  const current = getStepIndex(status);
  const isCancelled = status === "cancelled";
  const isEnforcement = status === "enforcement" || status === "in_dispute";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4">
        <XCircle className="w-5 h-5" />
        <span className="font-medium">This rental has been cancelled.</span>
      </div>
    );
  }

  if (isEnforcement) {
    return (
      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-4">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">
          This rental is under {status === "enforcement" ? "legal enforcement" : "dispute"}.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center min-w-[72px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-amber-500 text-white"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  active ? "font-semibold text-amber-700" : "text-neutral-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 min-w-[20px] ${
                  i < current ? "bg-green-400" : "bg-neutral-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PaymentSection({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Payments
        </h3>
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-sm border-b border-neutral-100 pb-2 last:border-0"
            >
              <div>
                <span className="font-medium capitalize">
                  {p.type.replace(/_/g, " ")}
                </span>
                <span className="text-neutral-500 ml-2">
                  {p.capturedAt
                    ? new Date(p.capturedAt).toLocaleDateString()
                    : new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                <Badge
                  className={
                    p.status === "captured"
                      ? "bg-green-100 text-green-700 border-0"
                      : p.status === "failed"
                      ? "bg-red-100 text-red-700 border-0"
                      : "bg-amber-100 text-amber-700 border-0"
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
  );
}

function LegalSection({
  legal,
  sanad,
}: {
  legal: LegalCommitment | null;
  sanad: SanadRecord | null;
}) {
  if (!legal) return null;
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Legal Commitment
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">Status</span>
            <p className="font-medium capitalize">
              {legal.status.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <span className="text-neutral-500">Commitment</span>
            <p className="font-medium">
              {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
            </p>
          </div>
          {legal.signedAt && (
            <div>
              <span className="text-neutral-500">Signed</span>
              <p className="font-medium">
                {new Date(legal.signedAt).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <span className="text-neutral-500">Contract version</span>
            <p className="font-medium">{legal.contractVersion}</p>
          </div>
        </div>

        {sanad && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Nafith Sanad
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Reference</span>
                <p className="font-mono text-xs">
                  {sanad.nafithReference ?? "Pending"}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Status</span>
                <p className="font-medium capitalize">
                  {sanad.status.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Principal</span>
                <p className="font-medium">
                  {formatSar(sanad.principalHalalas)}
                </p>
              </div>
              {sanad.maturityDate && (
                <div>
                  <span className="text-neutral-500">Maturity</span>
                  <p className="font-medium">{sanad.maturityDate}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [acting, setActing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setActing(true);
    try {
      await rentalsApi.cancel(id, cancelReason);
      toast({ title: "Rental cancelled", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      setShowCancel(false);
    } catch (err) {
      toast({
        title: "Cannot cancel",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  }

  async function handlePay() {
    setActing(true);
    try {
      await paymentsApi.charge(id);
      toast({ title: "Payment successful", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({
        title: "Payment failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleSign() {
    if (!data?.legal) return;
    setActing(true);
    try {
      await legalApi.sign(data.legal.id);
      toast({ title: "Contract signed successfully", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({
        title: "Signing failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
        Rental not found.
      </div>
    );
  }

  const { rental, legal, sanad, payments: paymentsList } = data;
  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);
  const needsSign = rental.status === "pending_legal_signing";
  const needsPay = rental.status === "pending_payment";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to rentals
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge
          className={`text-sm px-3 py-1 ${
            rental.status === "closed"
              ? "bg-green-100 text-green-700"
              : rental.status === "cancelled"
              ? "bg-neutral-200 text-neutral-600"
              : rental.status === "active"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          } border-0`}
        >
          {getRentalStatusLabel(rental.status)}
        </Badge>
      </div>

      {/* Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <StatusTimeline status={rental.status} />
        </CardContent>
      </Card>

      {/* Actions */}
      {(needsSign || needsPay || canCancel) && (
        <Card className="mb-6 border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Action Required</h3>
            <div className="flex gap-3 flex-wrap">
              {needsSign && (
                <Button
                  onClick={handleSign}
                  disabled={acting}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {acting ? "Signing..." : "Sign Contract via Nafath"}
                </Button>
              )}
              {needsPay && (
                <Button
                  onClick={handlePay}
                  disabled={acting}
                  className="bg-green-600 text-white hover:bg-green-500"
                >
                  {acting ? "Processing..." : "Pay " + formatSar(rental.totalPayableHalalas)}
                </Button>
              )}
              {canCancel && !showCancel && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancel(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Cancel Rental
                </Button>
              )}
            </div>
            {showCancel && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    disabled={acting || !cancelReason.trim()}
                    variant="destructive"
                    size="sm"
                  >
                    Confirm Cancel
                  </Button>
                  <Button
                    onClick={() => setShowCancel(false)}
                    variant="outline"
                    size="sm"
                  >
                    Nevermind
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Period</span>
                <span>
                  {rental.startDate} to {rental.endDate} ({rental.durationDays} days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Daily rate</span>
                <span>{formatSar(rental.dailyPriceHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
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
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Risk Assessment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Trust score at booking</span>
                <span className="font-medium">{rental.trustScoreAtBooking ?? "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Legal commitment</span>
                <span className="font-medium">
                  {formatSar(rental.legalCommitmentHalalas)} ({rental.legalCommitmentPct}%)
                </span>
              </div>
              {rental.confirmedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Confirmed</span>
                  <span>{new Date(rental.confirmedAt).toLocaleDateString()}</span>
                </div>
              )}
              {rental.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Delivered</span>
                  <span>{new Date(rental.deliveredAt).toLocaleDateString()}</span>
                </div>
              )}
              {rental.returnedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Returned</span>
                  <span>{new Date(rental.returnedAt).toLocaleDateString()}</span>
                </div>
              )}
              {rental.closedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Closed</span>
                  <span>{new Date(rental.closedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal + Payments */}
      <div className="space-y-6">
        <LegalSection legal={legal} sanad={sanad} />
        <PaymentSection payments={paymentsList} />
      </div>
    </div>
  );
}
