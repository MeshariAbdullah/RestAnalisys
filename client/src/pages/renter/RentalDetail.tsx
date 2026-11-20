import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDot,
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
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const LIFECYCLE_STEPS = [
  { key: "pending_risk_review", label: "Risk review", icon: Shield },
  { key: "pending_legal_signing", label: "Contract signing", icon: FileSignature },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "out_for_delivery", label: "Delivery", icon: Truck },
  { key: "active", label: "In use", icon: Package },
  { key: "return_in_transit", label: "Return", icon: Truck },
  { key: "under_inspection", label: "Inspection", icon: Shield },
  { key: "closed", label: "Closed", icon: CheckCircle2 },
];

const TERMINAL_STATUSES = new Set([
  "closed",
  "closed_with_penalty",
  "cancelled",
  "in_dispute",
  "enforcement",
]);

const CANCELLABLE_STATUSES = new Set([
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
  "confirmed",
]);

function statusIndex(status: string): number {
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = statusIndex(status);
  const isTerminal = TERMINAL_STATUSES.has(status);

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 p-4 bg-neutral-100 rounded-lg">
        <XCircle className="w-5 h-5 text-neutral-500" />
        <span className="font-medium text-neutral-600">Rental cancelled</span>
      </div>
    );
  }

  if (status === "in_dispute") {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
        <Gavel className="w-5 h-5 text-red-600" />
        <span className="font-medium text-red-700">Under dispute</span>
      </div>
    );
  }

  if (status === "enforcement") {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
        <Gavel className="w-5 h-5 text-red-700" />
        <span className="font-medium text-red-800">Sanad under enforcement</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-start justify-between">
        {LIFECYCLE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = currentIdx > i || (isTerminal && status === "closed");
          const isCurrent = currentIdx === i && !isTerminal;
          return (
            <div
              key={step.key}
              className="flex flex-col items-center flex-1 relative"
            >
              {i > 0 && (
                <div
                  className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                    isDone || isCurrent ? "bg-amber-400" : "bg-neutral-200"
                  }`}
                  style={{ left: "-50%" }}
                />
              )}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                  isDone
                    ? "bg-amber-500 text-white"
                    : isCurrent
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  <CircleDot className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1.5 text-center leading-tight ${
                  isDone || isCurrent
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PricingBreakdown({ rental }: { rental: Rental }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-neutral-600">
        <span>
          {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays} days
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
  );
}

function LegalCard({ legal }: { legal: LegalCommitment }) {
  const signed = !!legal.signedAt;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSignature className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold">Legal commitment</h3>
          <Badge
            className={
              signed
                ? "ml-auto bg-green-100 text-green-800 border-0"
                : "ml-auto bg-amber-100 text-amber-800 border-0"
            }
          >
            {legal.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500 text-xs uppercase">Commitment</p>
            <p className="font-bold text-lg mt-0.5">
              {formatSar(legal.commitmentHalalas)}
            </p>
            <p className="text-neutral-500 text-xs">
              {legal.commitmentPct}% of evaluated value
            </p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase">Contract</p>
            <p className="font-medium mt-0.5">
              Version {legal.contractVersion}
            </p>
            {signed && (
              <p className="text-green-700 text-xs mt-1">
                Signed {new Date(legal.signedAt!).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        {legal.clausesJson.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700">
              View {legal.clausesJson.length} contract clauses
            </summary>
            <div className="mt-3 space-y-3 border-t pt-3">
              {legal.clausesJson.map((c, i) => (
                <div key={c.id} className="text-sm">
                  <p className="font-medium">
                    {i + 1}. {c.titleEn}
                  </p>
                  <p className="text-neutral-600 text-xs mt-0.5 line-clamp-2">
                    {c.bodyEn}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function SanadCard({ sanad }: { sanad: SanadRecord }) {
  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    signed: "bg-green-100 text-green-800",
    issued: "bg-blue-100 text-blue-800",
    discharged: "bg-neutral-100 text-neutral-700",
    under_execution: "bg-red-100 text-red-800",
    executed: "bg-red-100 text-red-800",
  };
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold">Nafith Sanad</h3>
          <Badge
            className={`ml-auto border-0 ${
              statusColor[sanad.status] ?? "bg-neutral-100 text-neutral-700"
            }`}
          >
            {sanad.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500 text-xs uppercase">Principal</p>
            <p className="font-bold text-lg mt-0.5">
              {formatSar(sanad.principalHalalas)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs uppercase">Due amount</p>
            <p className="font-bold text-lg mt-0.5">
              {formatSar(sanad.dueHalalas)}
            </p>
          </div>
          {sanad.nafithReference && (
            <div>
              <p className="text-neutral-500 text-xs uppercase">
                Nafith reference
              </p>
              <p className="font-mono text-xs mt-0.5">
                {sanad.nafithReference}
              </p>
            </div>
          )}
          {sanad.maturityDate && (
            <div>
              <p className="text-neutral-500 text-xs uppercase">
                Maturity date
              </p>
              <p className="mt-0.5">{sanad.maturityDate}</p>
            </div>
          )}
        </div>
        {sanad.executionCaseNumber && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
            <p className="font-medium text-red-800">
              Najiz case: {sanad.executionCaseNumber}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return null;

  const typeLabel: Record<string, string> = {
    rental_fee: "Rental fee",
    platform_fee: "Platform fee",
    vat: "VAT",
    penalty: "Penalty",
    compensation: "Compensation",
    refund: "Refund",
  };

  const statusColor: Record<string, string> = {
    captured: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold">Payments</h3>
        </div>
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {typeLabel[p.type] ?? p.type}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                  {p.invoiceNumber && ` · ${p.invoiceNumber}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">
                  {formatSar(p.amountHalalas)}
                </span>
                <Badge
                  className={`text-[10px] border-0 ${
                    statusColor[p.status] ?? "bg-neutral-100 text-neutral-700"
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
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, "Cancelled by renter");
      await queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setError((err as Error).message ?? "Unable to cancel");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-neutral-100 rounded animate-pulse" />
          <div className="h-20 bg-neutral-100 rounded-xl animate-pulse" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-48 bg-neutral-100 rounded-xl animate-pulse" />
            <div className="h-48 bg-neutral-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <XCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>Rental not found or access denied.</p>
            <Link href="/my-rentals">
              <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Back to my rentals
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = CANCELLABLE_STATUSES.has(rental.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-rentals">
          <a className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
        </Link>
        <div className="flex-1">
          <p className="text-xs font-mono text-neutral-500">
            {rental.reference}
          </p>
          <h1 className="text-2xl font-bold">Rental details</h1>
        </div>
        <Badge
          className={`text-sm px-3 py-1 ${
            rental.status === "cancelled"
              ? "bg-neutral-200 text-neutral-700"
              : rental.status.startsWith("closed")
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          } border-0`}
        >
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Status timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <StatusTimeline status={rental.status} />
        </CardContent>
      </Card>

      {/* Rental info + pricing */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold">Rental period</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500 text-xs uppercase">Start</p>
                <p className="font-medium mt-0.5">{rental.startDate}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">End</p>
                <p className="font-medium mt-0.5">{rental.endDate}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Duration</p>
                <p className="font-medium mt-0.5">{rental.durationDays} days</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs uppercase">Created</p>
                <p className="font-medium mt-0.5">
                  {new Date(rental.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {rental.deliveredAt && (
              <p className="text-xs text-green-700 mt-3">
                Delivered {new Date(rental.deliveredAt).toLocaleDateString()}
              </p>
            )}
            {rental.returnedAt && (
              <p className="text-xs text-green-700 mt-1">
                Returned {new Date(rental.returnedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold">Pricing</h3>
            </div>
            <PricingBreakdown rental={rental} />
          </CardContent>
        </Card>
      </div>

      {/* Legal + Sanad */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {legal && <LegalCard legal={legal} />}
        {sanad && <SanadCard sanad={sanad} />}
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="mb-4">
          <PaymentHistory payments={payments} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Actions */}
      {(canCancel || !TERMINAL_STATUSES.has(rental.status)) && (
        <Card>
          <CardContent className="p-6 flex flex-wrap gap-3">
            {canCancel && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                {cancelling ? "Cancelling…" : "Cancel rental"}
              </Button>
            )}
            {rental.status === "pending_legal_signing" && legal && (
              <Link href={`/legal/${legal.id}`}>
                <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                  <FileSignature className="w-4 h-4 mr-1.5" />
                  Sign contract
                </Button>
              </Link>
            )}
            {!TERMINAL_STATUSES.has(rental.status) && (
              <Button
                variant="outline"
                onClick={() => navigate(`/my-rentals`)}
                className="ml-auto"
              >
                <Gavel className="w-4 h-4 mr-1.5" />
                Open dispute
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
