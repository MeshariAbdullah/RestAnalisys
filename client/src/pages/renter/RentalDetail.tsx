import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  FileSignature,
  Gavel,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, paymentsApi, formatSar, type Payment } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: typeof Clock; label?: string }
> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileSignature },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Clock },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Active" },
  return_in_transit: { color: "bg-blue-100 text-blue-700", icon: Clock },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-neutral-200 text-neutral-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-100 text-red-700", icon: Gavel },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: "bg-neutral-200 text-neutral-700", icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} hover:${cfg.color} border-0 text-xs`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    captured: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-800",
    authorized: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-neutral-200 text-neutral-600",
  };
  return (
    <Badge className={`${colors[status] ?? "bg-neutral-200 text-neutral-700"} border-0 text-xs`}>
      {status}
    </Badge>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      await paymentsApi.charge(id);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      toast({ title: "Payment successful", description: "Your rental is now confirmed.", variant: "success" });
    } catch (err) {
      const msg = (err as Error).message ?? "Payment failed";
      setError(msg);
      toast({ title: "Payment failed", description: msg, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading rental details…</div>;
  }
  if (!data) {
    return <div className="p-8">Rental not found.</div>;
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to My Rentals
        </a>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-sm font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Dates card */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
            <Calendar className="w-4 h-4" />
            Rental period
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Start</p>
              <p className="font-semibold mt-1">{rental.startDate}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">End</p>
              <p className="font-semibold mt-1">{rental.endDate}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Duration</p>
              <p className="font-semibold mt-1">{rental.durationDays} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing breakdown */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
            <CreditCard className="w-4 h-4" />
            Pricing breakdown
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>
                {formatSar(rental.dailyPriceHalalas)} × {rental.durationDays} days
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
            <div className="flex justify-between font-bold text-base pt-3 border-t">
              <span>Total</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-4 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
              <FileSignature className="w-4 h-4" />
              Legal commitment
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Commitment</p>
                <p className="font-bold text-lg text-amber-700 mt-1">
                  {formatSar(legal.commitmentHalalas)}
                </p>
                <p className="text-xs text-neutral-500">
                  {legal.commitmentPct}% of evaluated value
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Contract</p>
                <p className="font-semibold mt-1">{legal.contractVersion}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Status</p>
                <div className="mt-1">
                  {legal.signedAt ? (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Signed
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {legal.status.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sanad info */}
      {sanad && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
              <Gavel className="w-4 h-4" />
              Nafith Sanad (Promissory Note)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Reference</p>
                <p className="font-mono font-semibold mt-1">
                  {sanad.nafithReference ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Status</p>
                <p className="font-semibold mt-1">{sanad.status.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Principal</p>
                <p className="font-semibold mt-1">{formatSar(sanad.principalHalalas)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Maturity</p>
                <p className="font-semibold mt-1">{sanad.maturityDate}</p>
              </div>
            </div>
            {sanad.executionCaseNumber && (
              <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                Execution case: {sanad.executionCaseNumber}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
            <Shield className="w-4 h-4" />
            Payment history
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-500">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p: Payment) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 text-sm border-b last:border-0 pb-3 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium capitalize">{p.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                        {p.invoiceNumber && ` · ${p.invoiceNumber}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaymentStatusBadge status={p.status} />
                    <span className="font-semibold">{formatSar(p.amountHalalas)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {/* Actions */}
      {rental.status === "pending_legal_signing" && legal && (
        <Card className="border-amber-300">
          <CardContent className="p-6 text-center">
            <FileSignature className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-semibold mb-1">Contract awaiting signature</p>
            <p className="text-sm text-neutral-500 mb-4">
              Review and sign the legal commitment to proceed with payment.
            </p>
            <Link href={`/legal/${legal.id}`}>
              <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                Review & sign contract
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {rental.status === "pending_payment" && (
        <Card className="border-amber-300">
          <CardContent className="p-6 text-center">
            <CreditCard className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-semibold mb-1">Payment required</p>
            <p className="text-sm text-neutral-500 mb-4">
              Your contract is signed. Complete payment to confirm the rental.
            </p>
            <Button
              onClick={handlePay}
              disabled={paying}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {paying
                ? "Processing…"
                : `Pay ${formatSar(rental.totalPayableHalalas)} now`}
            </Button>
          </CardContent>
        </Card>
      )}

      {rental.status === "confirmed" && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">Payment confirmed</p>
              <p className="text-sm text-blue-700">
                Your rental is confirmed. The operations team will prepare your item for delivery.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {rental.status === "active" && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Rental active</p>
              <p className="text-sm text-green-700">
                The item is with you. Return by {rental.endDate} to avoid penalties.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {(rental.status === "closed" || rental.status === "closed_with_penalty") && (
        <Card className="border-neutral-200">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-neutral-500 shrink-0" />
            <div>
              <p className="font-semibold">Rental completed</p>
              <p className="text-sm text-neutral-500">
                Closed on {rental.closedAt ? new Date(rental.closedAt).toLocaleDateString() : "—"}.
                {rental.status === "closed_with_penalty" && " A penalty was applied."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {rental.status === "cancelled" && (
        <Card className="border-neutral-200 bg-neutral-50">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-neutral-400 shrink-0" />
            <div>
              <p className="font-semibold text-neutral-600">Rental cancelled</p>
              <p className="text-sm text-neutral-500">
                This rental was cancelled.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
