import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  FileSignature,
  Gavel,
  Package,
  Shield,
  Truck,
  XCircle,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const LIFECYCLE_STEPS = [
  { key: "pending_risk_review", label: "Risk review", icon: Shield },
  { key: "pending_legal_signing", label: "Sign contract", icon: FileSignature },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "out_for_delivery", label: "Shipping", icon: Truck },
  { key: "active", label: "In use", icon: Package },
  { key: "return_in_transit", label: "Returning", icon: Truck },
  { key: "under_inspection", label: "Inspection", icon: Shield },
  { key: "closed", label: "Closed", icon: CheckCircle2 },
];

const TERMINAL_STATUSES = [
  "closed",
  "closed_with_penalty",
  "cancelled",
  "in_dispute",
  "enforcement",
];

function stepIndex(status: string): number {
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  if (status === "closed_with_penalty") return LIFECYCLE_STEPS.length - 1;
  return idx >= 0 ? idx : -1;
}

function statusColor(status: string): string {
  if (status === "cancelled") return "bg-neutral-200 text-neutral-600";
  if (status === "in_dispute" || status === "enforcement")
    return "bg-red-100 text-red-700";
  if (status === "closed_with_penalty") return "bg-amber-100 text-amber-800";
  if (status === "closed") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}

function paymentStatusColor(status: string): string {
  if (status === "captured") return "bg-green-100 text-green-700";
  if (status === "pending" || status === "authorized")
    return "bg-amber-100 text-amber-800";
  if (status === "failed" || status === "chargeback")
    return "bg-red-100 text-red-700";
  if (status === "refunded") return "bg-blue-100 text-blue-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => rentalsApi.cancel(id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowCancel(false);
    },
  });

  const signMutation = useMutation({
    mutationFn: (commitmentId: number) => legalApi.sign(commitmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    },
  });

  const payMutation = useMutation({
    mutationFn: () => paymentsApi.charge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded mb-4" />
        <div className="h-64 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <p className="text-red-600">
          {(error as Error)?.message ?? "Rental not found."}
        </p>
        <Link href="/my-rentals">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to rentals
          </Button>
        </Link>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const currentStep = stepIndex(rental.status);
  const isTerminal = TERMINAL_STATUSES.includes(rental.status);
  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);
  const canSign =
    rental.status === "pending_legal_signing" &&
    legal?.status === "pending_signature";
  const canPay = rental.status === "pending_payment";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-rentals">
          <button className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{rental.reference}</h1>
            <Badge className={`${statusColor(rental.status)} border-0`}>
              {rental.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">
            {rental.startDate} &rarr; {rental.endDate} &middot;{" "}
            {rental.durationDays} days
          </p>
        </div>
      </div>

      {/* Timeline stepper */}
      {!isTerminal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between overflow-x-auto gap-1">
              {LIFECYCLE_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <React.Fragment key={step.key}>
                    {i > 0 && (
                      <div
                        className={`flex-1 h-0.5 min-w-[16px] ${
                          done ? "bg-amber-500" : "bg-neutral-200"
                        }`}
                      />
                    )}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          done
                            ? "bg-amber-500 text-white"
                            : active
                            ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] leading-tight text-center max-w-[64px] ${
                          active
                            ? "text-amber-700 font-semibold"
                            : done
                            ? "text-neutral-700"
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

      {/* Terminal status banner */}
      {rental.status === "cancelled" && (
        <div className="mb-6 flex items-center gap-3 bg-neutral-100 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-600">
          <XCircle className="w-5 h-5 text-neutral-400 shrink-0" />
          <div>
            <p className="font-medium">Rental cancelled</p>
            {rental.cancelledAt && (
              <p className="text-xs text-neutral-500 mt-0.5">
                on {new Date(rental.cancelledAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      {(rental.status === "in_dispute" || rental.status === "enforcement") && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">
              {rental.status === "in_dispute"
                ? "This rental is under dispute"
                : "Legal enforcement in progress"}
            </p>
            <p className="text-xs mt-0.5">
              Contact support for more information.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Pricing */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Pricing breakdown
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>
                    {formatSar(rental.dailyPriceHalalas)} &times;{" "}
                    {rental.durationDays} days
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

          {/* Legal commitment */}
          {legal && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-amber-500" />
                  Legal commitment
                </h2>
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    className={`border-0 ${
                      legal.status === "signed" || legal.status === "active"
                        ? "bg-green-100 text-green-700"
                        : legal.status === "breached"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {legal.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm text-neutral-500">
                    v{legal.contractVersion}
                  </span>
                </div>

                <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-500">Commitment amount</span>
                    <span className="font-semibold">
                      {formatSar(legal.commitmentHalalas)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Commitment level</span>
                    <span className="font-semibold">
                      {legal.commitmentPct}% of evaluated value
                    </span>
                  </div>
                </div>

                {legal.clausesJson && legal.clausesJson.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Contract clauses
                    </p>
                    {legal.clausesJson.slice(0, 3).map((clause) => (
                      <div
                        key={clause.id}
                        className="text-sm border-l-2 border-amber-300 pl-3 py-1"
                      >
                        <p className="font-medium">{clause.titleEn}</p>
                        <p className="text-neutral-500 text-xs line-clamp-2">
                          {clause.bodyEn}
                        </p>
                      </div>
                    ))}
                    {legal.clausesJson.length > 3 && (
                      <p className="text-xs text-neutral-500">
                        +{legal.clausesJson.length - 3} more clauses
                      </p>
                    )}
                  </div>
                )}

                {legal.signedAt && (
                  <p className="text-xs text-neutral-500">
                    Signed on{" "}
                    {new Date(legal.signedAt).toLocaleDateString("en-SA", {
                      dateStyle: "medium",
                    })}
                  </p>
                )}

                {canSign && (
                  <Button
                    onClick={() => signMutation.mutate(legal.id)}
                    disabled={signMutation.isPending}
                    className="w-full mt-3 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {signMutation.isPending
                      ? "Signing..."
                      : "Sign contract via Nafath"}
                  </Button>
                )}
                {signMutation.isError && (
                  <p className="text-sm text-red-600 mt-2">
                    {(signMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sanad */}
          {sanad && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-500" />
                  Sanad (Promissory note)
                </h2>
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    className={`border-0 ${
                      sanad.status === "signed" || sanad.status === "active"
                        ? "bg-green-100 text-green-700"
                        : sanad.status === "under_execution" ||
                          sanad.status === "executed"
                        ? "bg-red-100 text-red-700"
                        : sanad.status === "discharged"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {sanad.status.replace(/_/g, " ")}
                  </Badge>
                  {sanad.nafithReference && (
                    <span className="text-xs font-mono text-neutral-500">
                      {sanad.nafithReference}
                    </span>
                  )}
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Principal</span>
                    <span className="font-semibold">
                      {formatSar(sanad.principalHalalas)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Amount due</span>
                    <span className="font-semibold">
                      {formatSar(sanad.dueHalalas)}
                    </span>
                  </div>
                  {sanad.maturityDate && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Maturity date</span>
                      <span>{sanad.maturityDate}</span>
                    </div>
                  )}
                  {sanad.executionCaseNumber && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Execution case</span>
                      <span className="font-mono">
                        {sanad.executionCaseNumber}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {payments && payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  Payments
                </h2>
                <div className="space-y-3">
                  {payments.map((p: Payment) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {p.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {p.gateway} &middot;{" "}
                          {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatSar(p.amountHalalas)}
                        </p>
                        <Badge
                          className={`${paymentStatusColor(
                            p.status
                          )} border-0 text-[10px]`}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Daily rate
                </p>
                <p className="text-xl font-bold text-amber-600">
                  {formatSar(rental.dailyPriceHalalas)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Trust score at booking
                </p>
                <p className="text-lg font-semibold">
                  {rental.trustScoreAtBooking ?? "—"}/100
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Legal commitment
                </p>
                <p className="text-lg font-semibold">
                  {formatSar(rental.legalCommitmentHalalas)}
                </p>
                <p className="text-xs text-neutral-500">
                  {rental.legalCommitmentPct}% of asset value
                </p>
              </div>
              {rental.confirmedAt && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">
                    Confirmed
                  </p>
                  <p className="text-sm">
                    {new Date(rental.confirmedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {rental.deliveredAt && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">
                    Delivered
                  </p>
                  <p className="text-sm">
                    {new Date(rental.deliveredAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {rental.returnedAt && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">
                    Returned
                  </p>
                  <p className="text-sm">
                    {new Date(rental.returnedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {rental.closedAt && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">
                    Closed
                  </p>
                  <p className="text-sm">
                    {new Date(rental.closedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {(canPay || canCancel) && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold text-sm">Actions</h3>

                {canPay && (
                  <>
                    <Button
                      onClick={() => payMutation.mutate()}
                      disabled={payMutation.isPending}
                      className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      {payMutation.isPending ? "Processing..." : "Pay now"}
                    </Button>
                    {payMutation.isError && (
                      <p className="text-xs text-red-600">
                        {(payMutation.error as Error).message}
                      </p>
                    )}
                  </>
                )}

                {canCancel && !showCancel && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancel(true)}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancel rental
                  </Button>
                )}

                {showCancel && (
                  <div className="space-y-2 border border-red-200 rounded-lg p-3 bg-red-50/50">
                    <p className="text-xs text-red-700 font-medium">
                      Are you sure? This cannot be undone.
                    </p>
                    <Input
                      placeholder="Reason for cancellation"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCancel(false)}
                        className="flex-1"
                      >
                        Keep
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => cancelMutation.mutate()}
                        disabled={
                          cancelMutation.isPending || !cancelReason.trim()
                        }
                        className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      >
                        {cancelMutation.isPending ? "..." : "Confirm cancel"}
                      </Button>
                    </div>
                    {cancelMutation.isError && (
                      <p className="text-xs text-red-600">
                        {(cancelMutation.error as Error).message}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
