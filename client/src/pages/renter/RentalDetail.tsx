import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  CreditCard,
  FileSignature,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Package,
  XCircle,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rentalsApi, paymentsApi, legalApi, formatSar, type Rental } from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: typeof Clock; label: string }
> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Risk Review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileSignature, label: "Awaiting Signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting Payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle2, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Truck, label: "Out for Delivery" },
  active: { color: "bg-green-100 text-green-700", icon: Package, label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Truck, label: "Return in Transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under Inspection" },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Closed with Penalty" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "In Dispute" },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle, label: "Cancelled" },
};

export default function RentalDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const payMutation = useMutation({
    mutationFn: () => paymentsApi.charge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => rentalsApi.cancel(id, cancelReason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!data) return <div className="p-8">Rental not found.</div>;

  const { rental, legal, sanad, payments } = data;
  const cfg = STATUS_CONFIG[rental.status] ?? STATUS_CONFIG.pending_risk_review;
  const StatusIcon = cfg.icon;

  const steps = [
    { key: "created", label: "Booked", done: true, date: rental.createdAt },
    { key: "legal", label: "Contract Signed", done: !!legal?.signedAt, date: legal?.signedAt },
    { key: "paid", label: "Payment Captured", done: !!rental.confirmedAt, date: rental.confirmedAt },
    { key: "delivered", label: "Delivered", done: !!rental.deliveredAt, date: rental.deliveredAt },
    { key: "returned", label: "Returned", done: !!rental.returnedAt, date: rental.returnedAt },
    { key: "closed", label: "Closed", done: !!rental.closedAt, date: rental.closedAt },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to My Rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge className={`${cfg.color} border-0 text-sm py-1.5 px-3`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {cfg.label}
        </Badge>
      </div>

      {/* Progress Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
            Progress
          </h2>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-neutral-200" />
            {steps.map((step, i) => (
              <div key={step.key} className="relative flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.done
                      ? "bg-amber-500 text-neutral-950"
                      : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <p className="text-[10px] mt-1.5 text-center max-w-[70px]">
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[9px] text-neutral-400">
                    {new Date(step.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rental Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Rental Summary</h2>
            <div className="space-y-2 text-sm">
              <Row label="Duration" value={`${rental.startDate} → ${rental.endDate} (${rental.durationDays} days)`} />
              <Row label="Daily Rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform Fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="flex justify-between font-bold pt-2 border-t text-base">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal & Sanad */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Legal & Sanad
            </h2>
            <div className="space-y-2 text-sm">
              <Row
                label="Commitment"
                value={`${formatSar(rental.legalCommitmentHalalas)} (${rental.legalCommitmentPct}%)`}
              />
              <Row
                label="Contract Status"
                value={legal?.status?.replace(/_/g, " ") ?? "N/A"}
              />
              {legal?.signedAt && (
                <Row label="Signed At" value={new Date(legal.signedAt).toLocaleString()} />
              )}
              {sanad && (
                <>
                  <Row label="Sanad Status" value={sanad.status.replace(/_/g, " ")} />
                  <Row label="Sanad Reference" value={sanad.nafithReference ?? "Pending"} />
                  <Row label="Maturity Date" value={sanad.maturityDate} />
                </>
              )}
              <Row
                label="Trust Score"
                value={rental.trustScoreAtBooking ?? "N/A"}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Payments</h2>
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium capitalize">{p.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatSar(p.amountHalalas)}</p>
                    <Badge
                      className={
                        p.status === "captured"
                          ? "bg-green-100 text-green-700"
                          : p.status === "refunded"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-neutral-100 text-neutral-600"
                      }
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

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {rental.status === "pending_legal_signing" && legal && (
          <Link href={`/legal/${legal.id}`}>
            <Button className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400">
              <FileSignature className="w-4 h-4 mr-2" />
              Sign Legal Commitment
            </Button>
          </Link>
        )}

        {rental.status === "pending_payment" && (
          <Button
            className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {payMutation.isPending ? "Processing…" : "Pay Now"}
          </Button>
        )}
        {payMutation.isError && (
          <p className="text-sm text-red-600">
            {(payMutation.error as Error).message}
          </p>
        )}
        {payMutation.isSuccess && (
          <p className="text-sm text-green-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Payment successful!
          </p>
        )}

        {["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(
          rental.status
        ) && (
          <>
            {showCancel ? (
              <div className="flex gap-2">
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation"
                  className="flex-1"
                />
                <Button
                  variant="destructive"
                  disabled={cancelMutation.isPending || cancelReason.length < 3}
                  onClick={() => cancelMutation.mutate()}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Confirm"}
                </Button>
                <Button variant="outline" onClick={() => setShowCancel(false)}>
                  Back
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Rental
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
