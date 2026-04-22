import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Shield,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar, type Payment, type LegalCommitment, type SanadRecord } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending_risk_review: Clock,
  pending_legal_signing: FileText,
  pending_payment: CreditCard,
  confirmed: CheckCircle,
  out_for_delivery: Truck,
  active: Package,
  return_in_transit: Truck,
  under_inspection: Shield,
  closed: CheckCircle,
  closed_with_penalty: AlertTriangle,
  in_dispute: AlertTriangle,
  enforcement: XCircle,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-neutral-100 text-neutral-700",
  pending_legal_signing: "bg-amber-100 text-amber-700",
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-blue-100 text-blue-700",
  under_inspection: "bg-amber-100 text-amber-700",
  closed: "bg-green-100 text-green-700",
  closed_with_penalty: "bg-red-100 text-red-700",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-200 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};

const LIFECYCLE = [
  "pending_legal_signing",
  "pending_payment",
  "confirmed",
  "out_for_delivery",
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
];

export default function RentalDetail({ id }: { id: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => rentalsApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rental", id] });
      toast("Rental cancelled", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
        Rental not found.
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const Icon = STATUS_ICONS[rental.status] ?? Clock;
  const color = STATUS_COLORS[rental.status] ?? "bg-neutral-100 text-neutral-600";

  const currentIdx = LIFECYCLE.indexOf(rental.status);
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-sm font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge className={`text-sm px-3 py-1.5 ${color}`}>
          <Icon className="w-4 h-4 mr-1.5" />
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Timeline */}
      {!["cancelled", "enforcement", "in_dispute"].includes(rental.status) && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-4">Progress</h3>
            <div className="flex items-center gap-1">
              {LIFECYCLE.map((step, idx) => {
                const done = currentIdx >= idx;
                const active = currentIdx === idx;
                return (
                  <React.Fragment key={step}>
                    <div
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        done ? (active ? "bg-amber-500" : "bg-green-500") : "bg-neutral-200"
                      }`}
                    />
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-neutral-400">
              <span>Signing</span>
              <span>Payment</span>
              <span>Confirmed</span>
              <span>Delivery</span>
              <span>Active</span>
              <span>Return</span>
              <span>Inspect</span>
              <span>Closed</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pricing */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-3">Pricing Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Daily rate</span>
                <span className="font-medium">{formatSar(rental.dailyPriceHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Duration</span>
                <span className="font-medium">{rental.durationDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Platform fee</span>
                <span>{formatSar(rental.platformFeeHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">VAT (15%)</span>
                <span>{formatSar(rental.vatHalalas)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Commitment */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-3">Schedule & Commitment</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Start date</span>
                <span className="font-medium">{rental.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">End date</span>
                <span className="font-medium">{rental.endDate}</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-neutral-600">Legal commitment</span>
                <span className="font-medium">
                  {formatSar(rental.legalCommitmentHalalas)} ({rental.legalCommitmentPct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Trust score at booking</span>
                <span className="font-medium">{rental.trustScoreAtBooking ?? "-"}/100</span>
              </div>
              {rental.confirmedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Confirmed</span>
                  <span>{new Date(rental.confirmedAt).toLocaleDateString("en-SA")}</span>
                </div>
              )}
              {rental.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Delivered</span>
                  <span>{new Date(rental.deliveredAt).toLocaleDateString("en-SA")}</span>
                </div>
              )}
              {rental.returnedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Returned</span>
                  <span>{new Date(rental.returnedAt).toLocaleDateString("en-SA")}</span>
                </div>
              )}
              {rental.closedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Closed</span>
                  <span>{new Date(rental.closedAt).toLocaleDateString("en-SA")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-3">Legal Commitment</h3>
            <div className="flex items-center gap-3 mb-4">
              <Badge className={legal.signedAt ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {legal.status.replace(/_/g, " ")}
              </Badge>
              {legal.signedAt && (
                <span className="text-xs text-neutral-500">
                  Signed {new Date(legal.signedAt).toLocaleDateString("en-SA")}
                </span>
              )}
            </div>
            {legal.clausesJson && legal.clausesJson.length > 0 && (
              <div className="space-y-3">
                {legal.clausesJson.map((clause, idx) => (
                  <div key={idx} className="text-sm border-l-2 border-amber-400 pl-3">
                    <p className="font-medium">{clause.titleEn}</p>
                    <p className="text-neutral-500 text-xs mt-0.5">{clause.bodyEn}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-3">Payments</h3>
            <div className="space-y-2">
              {payments.map((p: Payment) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                  <div>
                    <span className="capitalize font-medium">{p.type.replace(/_/g, " ")}</span>
                    <span className="text-neutral-400 ml-2 text-xs">{p.gateway}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                    <Badge className="ml-2 text-xs">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-3">Sanad (Promissory Note)</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-500">Status</span>
                <p className="font-medium capitalize">{sanad.status.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-neutral-500">Principal</span>
                <p className="font-medium">{formatSar(sanad.principalHalalas)}</p>
              </div>
              {sanad.nafithReference && (
                <div>
                  <span className="text-neutral-500">Nafith Ref</span>
                  <p className="font-mono text-xs">{sanad.nafithReference}</p>
                </div>
              )}
              {sanad.maturityDate && (
                <div>
                  <span className="text-neutral-500">Maturity</span>
                  <p>{sanad.maturityDate}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canCancel && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              if (window.confirm("Are you sure you want to cancel this rental?")) {
                cancelMut.mutate("Cancelled by renter");
              }
            }}
            disabled={cancelMut.isPending}
          >
            Cancel Rental
          </Button>
          {rental.status === "pending_legal_signing" && legal && (
            <Link href={`/legal/${legal.id}`}>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Sign Legal Commitment
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
