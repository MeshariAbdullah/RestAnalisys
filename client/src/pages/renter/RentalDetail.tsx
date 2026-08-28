import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSignature,
  CreditCard,
  ArrowLeft,
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
import { formatDate } from "@/lib/utils";

const STATUS_META: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileSignature, label: "Awaiting legal signing" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package, label: "Out for delivery" },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package, label: "Return in transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under return inspection" },
  closed: { color: "bg-neutral-200 text-neutral-700", icon: CheckCircle, label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Closed (penalty)" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "In dispute" },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Under enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle, label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { color: "bg-neutral-200 text-neutral-700", icon: Clock, label: status.replace(/_/g, " ") };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0 text-sm px-3 py-1`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {meta.label}
    </Badge>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-neutral-500 text-sm">{label}</span>
      <span className="font-medium text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading || !data) {
    return <div className="p-8">Loading rental details...</div>;
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental Details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Rental Summary</h2>
            <div className="divide-y divide-neutral-100">
              <Row label="Period" value={`${rental.startDate} → ${rental.endDate}`} />
              <Row label="Duration" value={`${rental.durationDays} days`} />
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="flex justify-between py-2 font-semibold text-base">
                <span>Total</span>
                <span className="text-amber-600">{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Risk & Legal Commitment</h2>
            <div className="divide-y divide-neutral-100">
              <Row label="Trust score at booking" value={rental.trustScoreAtBooking} />
              <Row label="Commitment level" value={`${rental.legalCommitmentPct}%`} />
              <Row label="Commitment amount" value={formatSar(rental.legalCommitmentHalalas)} />
              {rental.confirmedAt && <Row label="Confirmed" value={formatDate(rental.confirmedAt)} />}
              {rental.deliveredAt && <Row label="Delivered" value={formatDate(rental.deliveredAt)} />}
              {rental.returnedAt && <Row label="Returned" value={formatDate(rental.returnedAt)} />}
              {rental.closedAt && <Row label="Closed" value={formatDate(rental.closedAt)} />}
            </div>
          </CardContent>
        </Card>

        {legal && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Legal Commitment</h2>
              <div className="divide-y divide-neutral-100">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Version" value={legal.contractVersion} />
                <Row label="Amount" value={formatSar(legal.commitmentHalalas)} />
                {legal.signedAt && <Row label="Signed" value={formatDate(legal.signedAt)} />}
              </div>
              {legal.status === "pending_signature" && (
                <Link href={`/legal/${legal.id}`}>
                  <Button className="w-full mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                    <FileSignature className="w-4 h-4 mr-2" />
                    Review & Sign
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Sanad (Promissory Note)</h2>
              <div className="divide-y divide-neutral-100">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Nafith reference" value={sanad.nafithReference} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due amount" value={formatSar(sanad.dueHalalas)} />
                <Row label="Maturity" value={sanad.maturityDate} />
                {sanad.executionCaseNumber && <Row label="Execution case" value={sanad.executionCaseNumber} />}
              </div>
            </CardContent>
          </Card>
        )}

        {payments.length > 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Payments</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Invoice</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: Payment) => (
                      <tr key={p.id} className="border-b border-neutral-50">
                        <td className="py-2.5">{p.type.replace(/_/g, " ")}</td>
                        <td className="py-2.5 font-medium">{formatSar(p.amountHalalas)}</td>
                        <td className="py-2.5">
                          <Badge variant="outline" className="text-xs">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-mono text-xs">{p.invoiceNumber ?? "—"}</td>
                        <td className="py-2.5 text-neutral-500">{formatDate(p.createdAt)}</td>
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
