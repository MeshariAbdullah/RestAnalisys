import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Shield,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar, type Rental, type LegalCommitment, type Payment } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", icon: Clock, label: "Risk Review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText, label: "Awaiting Signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting Payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package, label: "Out for Delivery" },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package, label: "Return in Transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under Inspection" },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Closed with Penalty" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "In Dispute" },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle, label: "Cancelled" },
};

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
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
      navigate("/my-rentals");
    } catch (err) {
      setCancelError((err as Error).message);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading…</div>;

  const { rental, legal, sanad, payments: pays } = data;
  const meta = STATUS_META[rental.status] ?? STATUS_META.pending_risk_review;
  const StatusIcon = meta.icon;
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(rental.status);
  const canDispute = ["active", "under_inspection", "closed_with_penalty"].includes(rental.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="text-sm text-neutral-500 hover:text-neutral-700 mb-4 inline-block"
      >
        ← Back to my rentals
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge className={`${meta.color} border-0 text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {meta.label}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Rental Period</h2>
            <div className="space-y-3 text-sm">
              <Row label="Start date" value={rental.startDate} />
              <Row label="End date" value={rental.endDate} />
              <Row label="Duration" value={`${rental.durationDays} days`} />
              {rental.deliveredAt && <Row label="Delivered" value={new Date(rental.deliveredAt).toLocaleDateString()} />}
              {rental.returnedAt && <Row label="Returned" value={new Date(rental.returnedAt).toLocaleDateString()} />}
              {rental.closedAt && <Row label="Closed" value={new Date(rental.closedAt).toLocaleDateString()} />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Financial Summary</h2>
            <div className="space-y-3 text-sm">
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Legal Commitment
            </h2>
            <div className="space-y-3 text-sm">
              <Row label="Commitment" value={formatSar(rental.legalCommitmentHalalas)} />
              <Row label="Percentage" value={`${rental.legalCommitmentPct}%`} />
              <Row label="Trust score at booking" value={String(rental.trustScoreAtBooking ?? "—")} />
              {legal && (
                <>
                  <Row label="Contract status" value={legal.status.replace(/_/g, " ")} />
                  {legal.signedAt && <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />}
                </>
              )}
              {sanad && (
                <>
                  <Row label="Sanad status" value={sanad.status.replace(/_/g, " ")} />
                  {sanad.nafithReference && <Row label="Nafith ref" value={sanad.nafithReference} />}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {pays.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payments
              </h2>
              <div className="space-y-3">
                {pays.map((p: Payment) => (
                  <div key={p.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="capitalize">{p.type.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {p.status}
                      </Badge>
                    </div>
                    <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        {canCancel && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel rental
          </Button>
        )}
        {canDispute && (
          <Button
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => navigate(`/dispute/open/${rental.id}`)}
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Open dispute
          </Button>
        )}
      </div>

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
