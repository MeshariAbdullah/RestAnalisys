import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Shield,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
  Gavel,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  rentalsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertTriangle },
  enforcement: { color: "bg-red-100 text-red-700", icon: Gavel },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { color: "bg-neutral-200 text-neutral-700", icon: Clock };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const DISPUTE_ELIGIBLE_STATUSES = [
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
  "closed_with_penalty",
];

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-20 text-neutral-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>Could not load rental details.</p>
        <Link href="/my-rentals">
          <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
            Back to my rentals
          </a>
        </Link>
      </div>
    );
  }

  const { rental, legal, sanad, payments: pays } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to my rentals
        </a>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental details</h1>
          <div className="mt-2">
            <StatusBadge status={rental.status} />
          </div>
        </div>
        {DISPUTE_ELIGIBLE_STATUSES.includes(rental.status) && (
          <Link href={`/dispute/new/${rental.id}`}>
            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              File dispute
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-6">
        {/* Dates & Pricing */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-lg">Booking & pricing</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Row label="Start date" value={rental.startDate} />
                <Row label="End date" value={rental.endDate} />
                <Row label="Duration" value={`${rental.durationDays} days`} />
                {rental.confirmedAt && (
                  <Row label="Confirmed" value={new Date(rental.confirmedAt).toLocaleDateString()} />
                )}
                {rental.deliveredAt && (
                  <Row label="Delivered" value={new Date(rental.deliveredAt).toLocaleDateString()} />
                )}
                {rental.returnedAt && (
                  <Row label="Returned" value={new Date(rental.returnedAt).toLocaleDateString()} />
                )}
              </div>
              <div className="space-y-3">
                <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
                <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
                <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
                <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
                <div className="border-t pt-3">
                  <Row
                    label="Total"
                    value={formatSar(rental.totalPayableHalalas)}
                    bold
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        {legal && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg">Legal commitment</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Contract version" value={legal.contractVersion} />
                <Row label="Commitment amount" value={formatSar(legal.commitmentHalalas)} />
                <Row label="Commitment %" value={`${legal.commitmentPct}%`} />
                {legal.signedAt && (
                  <Row label="Signed at" value={new Date(legal.signedAt).toLocaleString()} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sanad */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg">Sanad (promissory note)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                {sanad.nafithReference && (
                  <Row label="Nafith reference" value={sanad.nafithReference} />
                )}
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Amount due" value={formatSar(sanad.dueHalalas)} />
                {sanad.maturityDate && (
                  <Row label="Maturity date" value={sanad.maturityDate} />
                )}
                {sanad.executionCaseNumber && (
                  <Row label="Execution case" value={sanad.executionCaseNumber} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        {pays && pays.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg">Payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pays.map((p: Payment) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-3">{p.type.replace(/_/g, " ")}</td>
                        <td className="py-3">
                          <Badge
                            className={`border-0 ${
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
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatSar(p.amountHalalas)}
                        </td>
                        <td className="py-3 text-right text-neutral-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
