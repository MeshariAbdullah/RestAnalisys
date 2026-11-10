import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Package,
  FileSignature,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Truck,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  rentalsApi,
  legalApi,
  paymentsApi,
  disputesApi,
  formatSar,
} from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-neutral-200 text-neutral-700",
  pending_legal_signing: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-amber-100 text-amber-800",
  under_inspection: "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-700",
  closed_with_penalty: "bg-red-100 text-red-700",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-200 text-neutral-600",
};

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleSign() {
    if (!data?.legal) return;
    setActionError(null);
    setActionLoading(true);
    try {
      await legalApi.sign(data.legal.id);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePay() {
    setActionError(null);
    setActionLoading(true);
    try {
      await paymentsApi.charge(id);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    const reason = prompt("Reason for cancellation?");
    if (!reason) return;
    setActionError(null);
    setActionLoading(true);
    try {
      await rentalsApi.cancel(id, reason);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenDispute() {
    const summary = prompt("Describe the issue (at least 10 characters):");
    if (!summary || summary.length < 10) return;
    setActionError(null);
    setActionLoading(true);
    try {
      await disputesApi.open({
        rentalId: id,
        category: "service",
        summary,
      });
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading rental details...</div>;
  if (error)
    return (
      <div className="p-8 text-red-700">
        Failed to load rental: {(error as Error).message}
      </div>
    );
  if (!data) return <div className="p-8">Rental not found.</div>;

  const { rental, legal, sanad, payments: rentalPayments } = data;
  const statusColor =
    STATUS_COLORS[rental.status] ?? "bg-neutral-200 text-neutral-700";

  const canSign = rental.status === "pending_legal_signing" && legal?.status === "pending_signature";
  const canPay = rental.status === "pending_payment";
  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);
  const canDispute = ["active", "closed", "closed_with_penalty"].includes(
    rental.status
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to My Rentals
        </a>
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs text-neutral-500">
            {rental.reference}
          </p>
          <h1 className="text-2xl font-bold mt-1">Rental #{rental.id}</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {rental.startDate} &rarr; {rental.endDate} ({rental.durationDays}{" "}
            days)
          </p>
        </div>
        <Badge className={`${statusColor} border-0 text-sm`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {actionError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {actionError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pricing */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-neutral-500" />
              <h2 className="font-semibold">Pricing</h2>
            </div>
            <div className="space-y-2 text-sm">
              <Row
                label="Daily rate"
                value={formatSar(rental.dailyPriceHalalas)}
              />
              <Row
                label="Subtotal"
                value={formatSar(rental.rentalSubtotalHalalas)}
              />
              <Row
                label="Platform fee"
                value={formatSar(rental.platformFeeHalalas)}
              />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-2 mt-2">
                <Row
                  label="Total"
                  value={formatSar(rental.totalPayableHalalas)}
                  bold
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-neutral-500" />
              <h2 className="font-semibold">Legal commitment</h2>
            </div>
            {legal ? (
              <div className="space-y-2 text-sm">
                <Row
                  label="Status"
                  value={legal.status.replace(/_/g, " ")}
                />
                <Row
                  label="Commitment"
                  value={`${formatSar(legal.commitmentHalalas)} (${legal.commitmentPct}%)`}
                />
                <Row
                  label="Contract"
                  value={legal.contractVersion}
                />
                {legal.signedAt && (
                  <Row
                    label="Signed"
                    value={new Date(legal.signedAt).toLocaleDateString()}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No legal commitment yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sanad */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileSignature className="w-5 h-5 text-neutral-500" />
                <h2 className="font-semibold">Sanad (promissory note)</h2>
              </div>
              <div className="space-y-2 text-sm">
                <Row
                  label="Status"
                  value={sanad.status.replace(/_/g, " ")}
                />
                <Row
                  label="Reference"
                  value={sanad.nafithReference ?? "Pending"}
                />
                <Row
                  label="Principal"
                  value={formatSar(sanad.principalHalalas)}
                />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                <Row label="Maturity" value={sanad.maturityDate} />
                {sanad.executionCaseNumber && (
                  <Row
                    label="Execution case"
                    value={sanad.executionCaseNumber}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-neutral-500" />
              <h2 className="font-semibold">Payments</h2>
            </div>
            {rentalPayments.length === 0 ? (
              <p className="text-sm text-neutral-500">No payments yet.</p>
            ) : (
              <div className="space-y-3">
                {rentalPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium capitalize">
                        {p.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-neutral-500 ml-2">
                        {p.status}
                      </span>
                    </div>
                    <span className="font-mono">
                      {formatSar(p.amountHalalas)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {(canSign || canPay || canCancel || canDispute) && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Actions</h2>
            <div className="flex gap-3 flex-wrap">
              {canSign && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSign}
                  disabled={actionLoading}
                >
                  <FileSignature className="w-4 h-4 mr-1" />
                  Sign contract
                </Button>
              )}
              {canPay && (
                <Button
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  onClick={handlePay}
                  disabled={actionLoading}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Pay now
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  Cancel rental
                </Button>
              )}
              {canDispute && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleOpenDispute}
                  disabled={actionLoading}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Open dispute
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Timeline</h2>
          <div className="space-y-3 text-sm">
            <TimelineItem
              icon={Clock}
              label="Created"
              date={rental.createdAt}
            />
            {rental.confirmedAt && (
              <TimelineItem
                icon={CheckCircle}
                label="Confirmed"
                date={rental.confirmedAt}
              />
            )}
            {rental.deliveredAt && (
              <TimelineItem
                icon={Truck}
                label="Delivered"
                date={rental.deliveredAt}
              />
            )}
            {rental.returnedAt && (
              <TimelineItem
                icon={Package}
                label="Returned"
                date={rental.returnedAt}
              />
            )}
            {rental.closedAt && (
              <TimelineItem
                icon={CheckCircle}
                label="Closed"
                date={rental.closedAt}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
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
      <span className={`text-neutral-500 ${bold ? "font-semibold" : ""}`}>
        {label}
      </span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  date,
}: {
  icon: typeof Clock;
  label: string;
  date: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
      <span className="font-medium">{label}</span>
      <span className="text-neutral-500 text-xs ml-auto">
        {new Date(date).toLocaleString()}
      </span>
    </div>
  );
}
