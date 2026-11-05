import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, legalApi, paymentsApi, formatSar } from "@/lib/api";

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
  enforcement: "bg-red-200 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!confirm("Cancel this rental?")) return;
    setActing(true);
    setActionError(null);
    try {
      await rentalsApi.cancel(id, "Renter requested cancellation");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActing(false);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading...</div>;

  const { rental, legal, sanad, payments } = data;
  const statusColor = STATUS_COLORS[rental.status] ?? "bg-neutral-200 text-neutral-700";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to rentals
        </a>
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental #{rental.id}</h1>
        </div>
        <Badge className={`${statusColor} border-0 text-sm px-3 py-1`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Package className="w-5 h-5" />
              Rental details
            </h2>
            <dl className="space-y-3 text-sm">
              <Row label="Period" value={`${rental.startDate} to ${rental.endDate}`} />
              <Row label="Duration" value={`${rental.durationDays} days`} />
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-amber-600">{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" />
              Legal commitment
            </h2>
            {legal ? (
              <dl className="space-y-3 text-sm">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Commitment" value={formatSar(legal.commitmentHalalas)} />
                <Row label="Rate" value={`${legal.commitmentPct}%`} />
                <Row label="Contract" value={legal.contractVersion} />
                {legal.signedAt && (
                  <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />
                )}
                {legal.status === "pending_signature" && (
                  <div className="pt-3">
                    <Link href={`/legal/${legal.id}`}>
                      <Button className="w-full bg-amber-600 hover:bg-amber-700">
                        <FileText className="w-4 h-4 mr-2" />
                        Sign contract
                      </Button>
                    </Link>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment yet.</p>
            )}
          </CardContent>
        </Card>

        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" />
                Sanad (Promissory Note)
              </h2>
              <dl className="space-y-3 text-sm">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Reference" value={sanad.nafithReference ?? "—"} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                {sanad.maturityDate && (
                  <Row label="Maturity" value={sanad.maturityDate} />
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {payments.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                Payments
              </h2>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{p.type.replace(/_/g, " ")}</span>
                      <Badge className="ml-2 text-xs" variant="outline">
                        {p.status}
                      </Badge>
                    </div>
                    <span className="font-mono">{formatSar(p.amountHalalas)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {rental.status === "pending_legal_signing" || rental.status === "pending_payment" || rental.status === "confirmed" ? (
        <div className="mt-6">
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleCancel}
            disabled={acting}
          >
            Cancel rental
          </Button>
        </div>
      ) : null}

      {actionError && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {actionError}
        </div>
      )}

      <div className="mt-6 text-sm text-neutral-400">
        {rental.confirmedAt && <span>Confirmed {new Date(rental.confirmedAt).toLocaleDateString()} </span>}
        {rental.deliveredAt && <span>| Delivered {new Date(rental.deliveredAt).toLocaleDateString()} </span>}
        {rental.returnedAt && <span>| Returned {new Date(rental.returnedAt).toLocaleDateString()} </span>}
        {rental.closedAt && <span>| Closed {new Date(rental.closedAt).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
