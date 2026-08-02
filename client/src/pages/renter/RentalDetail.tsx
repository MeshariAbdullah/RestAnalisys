import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, paymentsApi, formatSar } from "@/lib/api";

const STATUS_STEPS = [
  { key: "pending_risk_review", label: "Risk review", icon: Shield },
  { key: "pending_legal_signing", label: "Legal signing", icon: FileText },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "out_for_delivery", label: "Delivery", icon: Package },
  { key: "active", label: "In use", icon: CheckCircle },
  { key: "return_in_transit", label: "Return", icon: Package },
  { key: "under_inspection", label: "Inspection", icon: Clock },
  { key: "closed", label: "Closed", icon: CheckCircle },
];

const TERMINAL_STATUSES = ["closed", "closed_with_penalty", "in_dispute", "enforcement", "cancelled"];

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (TERMINAL_STATUSES.includes(status)) return STATUS_STEPS.length;
  return idx >= 0 ? idx : 0;
}

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    const reason = prompt("Reason for cancellation?");
    if (!reason) return;
    setCancelError(null);
    try {
      await rentalsApi.cancel(id, reason);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setCancelError((err as Error).message);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading...</div>;

  const { rental, legal, sanad, payments } = data;
  const currentStep = getStepIndex(rental.status);
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment", "confirmed"].includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
          <p className="text-neutral-500 mt-1">
            {rental.startDate} → {rental.endDate} ({rental.durationDays} days)
          </p>
        </div>
        <Badge
          className={
            rental.status === "active"
              ? "bg-green-100 text-green-700"
              : TERMINAL_STATUSES.includes(rental.status)
              ? "bg-neutral-200 text-neutral-700"
              : "bg-blue-100 text-blue-700"
          }
        >
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Status timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Progress</h2>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[72px]">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        done
                          ? "bg-amber-500 text-white"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] mt-1 text-center ${
                        done ? "text-neutral-800 font-medium" : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-6 ${
                        i < currentStep ? "bg-amber-500" : "bg-neutral-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pricing breakdown */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Pricing</h2>
            <div className="space-y-2 text-sm">
              <Row label={`${rental.durationDays} days × ${formatSar(rental.dailyPriceHalalas)}`} value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Legal commitment</h2>
            {legal ? (
              <div className="space-y-2 text-sm">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Commitment" value={formatSar(legal.commitmentHalalas)} />
                <Row label="Rate" value={`${legal.commitmentPct}%`} />
                {legal.signedAt && (
                  <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />
                )}
                {rental.status === "pending_legal_signing" && (
                  <Link href={`/legal/${legal.id}`}>
                    <Button className="w-full mt-3 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                      Sign contract
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Sanad */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Sanad (promissory note)</h2>
              <div className="space-y-2 text-sm">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                {sanad.nafithReference && (
                  <Row label="Nafith ref" value={sanad.nafithReference} />
                )}
                {sanad.maturityDate && (
                  <Row label="Maturity" value={sanad.maturityDate} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Payments</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-neutral-500">No payments recorded.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{p.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-neutral-500">{p.gateway} · {p.status}</p>
                    </div>
                    <p className="font-mono">{formatSar(p.amountHalalas)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {canCancel && (
        <div className="mt-6">
          <Button variant="outline" onClick={handleCancel} className="text-red-600 border-red-200 hover:bg-red-50">
            <AlertCircle className="w-4 h-4 mr-1" /> Cancel rental
          </Button>
        </div>
      )}

      {cancelError && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {cancelError}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
