import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Shield,
  Calendar,
  Receipt,
  FileSignature,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, paymentsApi, formatSar } from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: typeof Clock }
> = {
  pending_risk_review: { color: "text-amber-700", bg: "bg-amber-100", icon: Clock },
  pending_legal_signing: { color: "text-amber-700", bg: "bg-amber-100", icon: FileSignature },
  pending_payment: { color: "text-amber-700", bg: "bg-amber-100", icon: Receipt },
  confirmed: { color: "text-blue-700", bg: "bg-blue-100", icon: CheckCircle },
  out_for_delivery: { color: "text-blue-700", bg: "bg-blue-100", icon: Truck },
  active: { color: "text-green-700", bg: "bg-green-100", icon: Package },
  return_in_transit: { color: "text-blue-700", bg: "bg-blue-100", icon: Truck },
  under_inspection: { color: "text-amber-700", bg: "bg-amber-100", icon: Clock },
  closed: { color: "text-green-700", bg: "bg-green-100", icon: CheckCircle },
  closed_with_penalty: { color: "text-red-700", bg: "bg-red-100", icon: AlertTriangle },
  in_dispute: { color: "text-red-700", bg: "bg-red-100", icon: AlertTriangle },
  enforcement: { color: "text-red-700", bg: "bg-red-100", icon: XCircle },
  cancelled: { color: "text-neutral-600", bg: "bg-neutral-200", icon: XCircle },
};

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
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
    } catch (err) {
      setError((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, "Cancelled by renter");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading rental…</div>;

  const { rental, legal, sanad, payments } = data;
  const cfg = STATUS_CONFIG[rental.status] ?? STATUS_CONFIG.pending_risk_review;
  const StatusIcon = cfg.icon;
  const canPay = rental.status === "pending_payment";
  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);
  const canSign = rental.status === "pending_legal_signing" && legal;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="text-sm text-neutral-500 hover:text-neutral-700 mb-4 inline-block"
      >
        &larr; Back to my rentals
      </button>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${cfg.bg} ${cfg.color} border-0 text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Rental summary */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Rental period
              </h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">Start</p>
                  <p className="font-semibold">{rental.startDate}</p>
                </div>
                <div>
                  <p className="text-neutral-500">End</p>
                  <p className="font-semibold">{rental.endDate}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Duration</p>
                  <p className="font-semibold">{rental.durationDays} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing breakdown */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Pricing
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">
                    {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays} days
                  </span>
                  <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Platform fee</span>
                  <span>{formatSar(rental.platformFeeHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">VAT 15%</span>
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
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileSignature className="w-5 h-5" />
                  Legal commitment
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Status</p>
                    <Badge
                      className={
                        legal.status === "signed"
                          ? "bg-green-100 text-green-700 border-0"
                          : "bg-amber-100 text-amber-700 border-0"
                      }
                    >
                      {legal.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-neutral-500">Commitment amount</p>
                    <p className="font-semibold">
                      {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Contract version</p>
                    <p>{legal.contractVersion}</p>
                  </div>
                  {legal.signedAt && (
                    <div>
                      <p className="text-neutral-500">Signed at</p>
                      <p>{new Date(legal.signedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sanad */}
          {sanad && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Nafith Sanad
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Status</p>
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      {sanad.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-neutral-500">Reference</p>
                    <p className="font-mono">{sanad.nafithReference ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Principal</p>
                    <p className="font-semibold">{formatSar(sanad.principalHalalas)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Maturity</p>
                    <p>{sanad.maturityDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments history */}
          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Payments</h2>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{p.type.replace(/_/g, " ")}</p>
                        <p className="text-neutral-500 text-xs">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                        <Badge
                          className={`text-xs border-0 ${
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "refunded"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
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
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {canSign && (
            <Card className="border-amber-300 bg-amber-50/40">
              <CardContent className="p-6">
                <p className="font-semibold text-amber-900 mb-2">
                  Contract ready for signing
                </p>
                <p className="text-sm text-amber-800 mb-4">
                  Review and sign the legal commitment to proceed.
                </p>
                <Button
                  className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  onClick={() => navigate(`/legal/${legal!.id}`)}
                >
                  Review & sign
                </Button>
              </CardContent>
            </Card>
          )}

          {canPay && (
            <Card className="border-green-300 bg-green-50/40">
              <CardContent className="p-6">
                <p className="font-semibold text-green-900 mb-2">
                  Ready for payment
                </p>
                <p className="text-sm text-green-800 mb-4">
                  Contract signed. Complete payment to confirm your rental.
                </p>
                <Button
                  className="w-full bg-neutral-900 hover:bg-neutral-800"
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying
                    ? "Processing…"
                    : `Pay ${formatSar(rental.totalPayableHalalas)}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling…" : "Cancel rental"}
            </Button>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          {/* Timeline */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <TimelineEntry
                  label="Created"
                  date={rental.createdAt}
                  done
                />
                <TimelineEntry
                  label="Confirmed"
                  date={rental.confirmedAt}
                  done={!!rental.confirmedAt}
                />
                <TimelineEntry
                  label="Delivered"
                  date={rental.deliveredAt}
                  done={!!rental.deliveredAt}
                />
                <TimelineEntry
                  label="Returned"
                  date={rental.returnedAt}
                  done={!!rental.returnedAt}
                />
                <TimelineEntry
                  label="Closed"
                  date={rental.closedAt}
                  done={!!rental.closedAt}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({
  label,
  date,
  done,
}: {
  label: string;
  date?: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          done ? "bg-green-500" : "bg-neutral-300"
        }`}
      />
      <span className={done ? "font-medium" : "text-neutral-400"}>{label}</span>
      {date && (
        <span className="ml-auto text-xs text-neutral-500">
          {new Date(date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
