import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  rentalsApi,
  legalApi,
  paymentsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const TIMELINE_STEPS = [
  { key: "pending_risk_review", label: "Risk review", icon: Shield },
  { key: "pending_legal_signing", label: "Sign contract", icon: FileSignature },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "out_for_delivery", label: "Shipping", icon: Truck },
  { key: "active", label: "In use", icon: Package },
  { key: "return_in_transit", label: "Returning", icon: Truck },
  { key: "under_inspection", label: "Inspection", icon: Shield },
  { key: "closed", label: "Completed", icon: CheckCircle2 },
] as const;

const STATUS_ORDER: Record<string, number> = {};
TIMELINE_STEPS.forEach((s, i) => {
  STATUS_ORDER[s.key] = i;
});

function statusColor(status: string): string {
  if (["closed", "closed_with_penalty"].includes(status))
    return "bg-green-100 text-green-700";
  if (["cancelled"].includes(status)) return "bg-neutral-200 text-neutral-600";
  if (["in_dispute", "enforcement"].includes(status))
    return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

function sanadStatusColor(status: string): string {
  if (status === "discharged") return "bg-green-100 text-green-700";
  if (["under_execution", "executed"].includes(status))
    return "bg-red-100 text-red-700";
  if (["active", "signed"].includes(status))
    return "bg-blue-100 text-blue-700";
  return "bg-neutral-200 text-neutral-600";
}

export default function RentalDetail({ id }: { id: number }) {
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [openingDispute, setOpeningDispute] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental-detail", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-red-600">Failed to load rental details.</p>
        <Link href="/my-rentals">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to rentals
          </Button>
        </Link>
      </div>
    );
  }

  const { rental, legal, sanad, payments: rentalPayments } = data;
  const currentStep = STATUS_ORDER[rental.status] ?? -1;
  const isTerminal = [
    "closed",
    "closed_with_penalty",
    "cancelled",
    "enforcement",
    "in_dispute",
  ].includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> My rentals
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental details</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`${statusColor(rental.status)} border-0`}>
              {rental.status.replace(/_/g, " ")}
            </Badge>
            <span className="text-sm text-neutral-500">
              {rental.startDate} - {rental.endDate} ({rental.durationDays} days)
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500 uppercase">Total</p>
          <p className="text-2xl font-bold">
            {formatSar(rental.totalPayableHalalas)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {!isTerminal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Progress
            </h2>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {TIMELINE_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                const StepIcon = step.icon;
                return (
                  <React.Fragment key={step.key}>
                    <div
                      className={`flex flex-col items-center min-w-[80px] ${
                        active ? "opacity-100" : done ? "opacity-70" : "opacity-30"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          done
                            ? "bg-amber-500 text-white"
                            : "bg-neutral-200 text-neutral-400"
                        } ${active ? "ring-2 ring-amber-300 ring-offset-2" : ""}`}
                      >
                        {done && !active ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-4 h-4" />
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-1.5 text-center ${
                          active ? "font-semibold text-amber-700" : "text-neutral-500"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 min-w-[12px] ${
                          i < currentStep ? "bg-amber-400" : "bg-neutral-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terminal status banner */}
      {rental.status === "cancelled" && (
        <Card className="mb-6 border-neutral-300 bg-neutral-50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-neutral-500" />
            <div>
              <p className="font-semibold text-neutral-700">Rental cancelled</p>
              {rental.closedAt && (
                <p className="text-xs text-neutral-500">
                  {new Date(rental.closedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(rental.status === "in_dispute" || rental.status === "enforcement") && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-semibold text-red-700">
                {rental.status === "enforcement"
                  ? "Under legal enforcement"
                  : "In dispute"}
              </p>
              <p className="text-xs text-red-500">
                The platform is handling this matter.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pricing breakdown */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Pricing
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">
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
                <span>VAT 15%</span>
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
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Legal commitment
            </h2>
            {legal ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status</span>
                  <Badge variant="outline">
                    {legal.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Commitment</span>
                  <span className="font-semibold">
                    {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Contract version</span>
                  <span>{legal.contractVersion}</span>
                </div>
                {legal.signedAt && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Signed</span>
                    <span>{new Date(legal.signedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">
                No legal commitment yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sanad */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
                Nafith Sanad
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status</span>
                  <Badge className={`${sanadStatusColor(sanad.status)} border-0`}>
                    {sanad.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {sanad.nafithReference && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Reference</span>
                    <span className="font-mono text-xs">
                      {sanad.nafithReference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-600">Principal</span>
                  <span>{formatSar(sanad.principalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Due amount</span>
                  <span className="font-semibold">
                    {formatSar(sanad.dueHalalas)}
                  </span>
                </div>
                {sanad.maturityDate && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Maturity</span>
                    <span>{sanad.maturityDate}</span>
                  </div>
                )}
                {sanad.executionCaseNumber && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Execution case</span>
                    <span className="font-mono">{sanad.executionCaseNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment history */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Payments
            </h2>
            {rentalPayments && rentalPayments.length > 0 ? (
              <div className="space-y-3">
                {rentalPayments.map((p: Payment) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b border-neutral-100 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {p.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString()} ·{" "}
                        <span className="capitalize">{p.status}</span>
                      </p>
                    </div>
                    <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">No payments yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {["active", "return_in_transit"].includes(rental.status) && (
        <Card className="mt-6 border-amber-100 bg-amber-50/30">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">
              Actions
            </h2>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                disabled={openingDispute}
                onClick={() => {
                  setOpeningDispute(true);
                  setDisputeError(null);
                }}
              >
                <Gavel className="w-4 h-4 mr-1.5" />
                Open a dispute
              </Button>
            </div>
            {openingDispute && (
              <div className="mt-4 p-4 border rounded-lg bg-white">
                <p className="text-sm font-medium mb-3">Report an issue</p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const category = (
                      form.elements.namedItem("category") as HTMLSelectElement
                    ).value as "damage" | "loss" | "fraud" | "service" | "billing";
                    const summary = (
                      form.elements.namedItem("summary") as HTMLTextAreaElement
                    ).value;
                    try {
                      await disputesApi.open({
                        rentalId: rental.id,
                        category,
                        summary,
                      });
                      setOpeningDispute(false);
                      window.location.reload();
                    } catch (err) {
                      setDisputeError(
                        (err as Error).message ?? "Failed to open dispute"
                      );
                    }
                  }}
                >
                  <select
                    name="category"
                    required
                    className="w-full border rounded px-3 py-2 text-sm mb-3"
                  >
                    <option value="damage">Damage</option>
                    <option value="loss">Loss</option>
                    <option value="service">Service issue</option>
                    <option value="billing">Billing issue</option>
                    <option value="fraud">Fraud</option>
                  </select>
                  <textarea
                    name="summary"
                    required
                    minLength={10}
                    rows={3}
                    placeholder="Describe the issue in detail..."
                    className="w-full border rounded px-3 py-2 text-sm mb-3"
                  />
                  {disputeError && (
                    <p className="text-sm text-red-600 mb-3">{disputeError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-red-600 text-white hover:bg-red-500">
                      Submit dispute
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpeningDispute(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
