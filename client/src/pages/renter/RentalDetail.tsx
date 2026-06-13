import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  FileSignature,
  CreditCard,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar } from "@/lib/api";

const STATUS_STEPS = [
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

function StatusTimeline({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current);
  const isFinal = ["closed", "closed_with_penalty", "cancelled", "enforcement"].includes(current);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_STEPS.map((step, i) => {
        const done = i < idx || isFinal;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div
                className={`h-0.5 w-6 shrink-0 ${
                  done ? "bg-green-500" : "bg-neutral-200"
                }`}
              />
            )}
            <div
              className={`shrink-0 w-3 h-3 rounded-full border-2 ${
                done
                  ? "bg-green-500 border-green-500"
                  : active
                  ? "bg-amber-500 border-amber-500"
                  : "bg-white border-neutral-300"
              }`}
              title={step.replace(/_/g, " ")}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error || !data)
    return <div className="p-8 text-red-600">Rental not found.</div>;

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to My Rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      <StatusTimeline current={rental.status} />

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Pricing */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              Pricing breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="Duration" value={`${rental.durationDays} days`} />
              <Row
                label={`${formatSar(rental.dailyPriceHalalas)} x ${rental.durationDays} days`}
                value={formatSar(rental.rentalSubtotalHalalas)}
              />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Delivery */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Schedule
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="Start date" value={rental.startDate} />
              <Row label="End date" value={rental.endDate} />
              {rental.confirmedAt && (
                <Row label="Confirmed" value={new Date(rental.confirmedAt).toLocaleDateString()} />
              )}
              {rental.deliveredAt && (
                <Row label="Delivered" value={new Date(rental.deliveredAt).toLocaleDateString()} />
              )}
              {rental.returnedAt && (
                <Row label="Returned" value={new Date(rental.returnedAt).toLocaleDateString()} />
              )}
              {rental.closedAt && (
                <Row label="Closed" value={new Date(rental.closedAt).toLocaleDateString()} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        {legal && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-amber-500" />
                Legal commitment
              </h3>
              <div className="space-y-2 text-sm">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Commitment" value={formatSar(legal.commitmentHalalas)} />
                <Row label="Commitment %" value={`${legal.commitmentPct}%`} />
                <Row label="Version" value={legal.contractVersion} />
                {legal.signedAt && (
                  <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />
                )}
              </div>
              {legal.status === "pending_signature" && (
                <Link href={`/legal/${legal.id}`}>
                  <Button className="w-full mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                    Sign contract
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sanad */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                Sanad (promissory note)
              </h3>
              <div className="space-y-2 text-sm">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                {sanad.nafithReference && (
                  <Row label="Nafith ref" value={sanad.nafithReference} />
                )}
                {sanad.maturityDate && <Row label="Maturity" value={sanad.maturityDate} />}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              Payments ({payments.length})
            </h3>
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <Badge variant="outline" className="mr-2">
                      {p.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-neutral-500">{p.gateway}</span>
                    {p.invoiceNumber && (
                      <span className="text-neutral-400 ml-2 text-xs">#{p.invoiceNumber}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk info */}
      {rental.riskSnapshotJson && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Risk assessment
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="Trust score at booking" value={String(rental.trustScoreAtBooking ?? "N/A")} />
              <Row label="Commitment %" value={`${rental.legalCommitmentPct}%`} />
              <Row label="Commitment amount" value={formatSar(rental.legalCommitmentHalalas)} />
            </div>
          </CardContent>
        </Card>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_legal_signing: "bg-amber-100 text-amber-800",
    pending_payment: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-700",
    out_for_delivery: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    closed: "bg-green-100 text-green-700",
    closed_with_penalty: "bg-red-100 text-red-700",
    enforcement: "bg-red-100 text-red-700",
    cancelled: "bg-neutral-200 text-neutral-600",
  };
  return (
    <Badge className={`${colors[status] ?? "bg-neutral-200 text-neutral-700"} border-0`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    captured: "text-green-700",
    pending: "text-amber-700",
    failed: "text-red-700",
    refunded: "text-blue-700",
  };
  return (
    <span className={`text-xs ${colors[status] ?? "text-neutral-500"}`}>
      {status}
    </span>
  );
}
