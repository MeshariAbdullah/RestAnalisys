import React from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Shield,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  rentalsApi,
  paymentsApi,
  legalApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import {
  getRentalStatusLabel,
  getRentalStatusColor,
  relativeTime,
} from "@/lib/utils";

const STATUS_ORDER = [
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

function statusProgress(status: string): number {
  const idx = STATUS_ORDER.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STATUS_ORDER.length) * 100);
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Rental not found.</div>;

  const { rental, legal, sanad, payments: paymentsList } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to rentals
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{rental.reference}</h1>
          <p className="text-neutral-500 mt-1">
            Created {relativeTime(rental.createdAt)}
          </p>
        </div>
        <Badge className={`text-sm px-3 py-1 ${getRentalStatusColor(rental.status)}`}>
          {getRentalStatusLabel(rental.status)}
        </Badge>
      </div>

      {/* Progress bar */}
      {!["cancelled", "in_dispute", "enforcement"].includes(rental.status) && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex justify-between text-xs text-neutral-500 mb-2">
              <span>Created</span>
              <span>Closed</span>
            </div>
            <Progress value={statusProgress(rental.status)} className="h-2" />
            <div className="flex flex-wrap gap-2 mt-3">
              {STATUS_ORDER.map((s) => {
                const current = STATUS_ORDER.indexOf(rental.status);
                const idx = STATUS_ORDER.indexOf(s);
                const done = idx <= current;
                return (
                  <span
                    key={s}
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      done
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {getRentalStatusLabel(s)}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Rental details */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Rental Details
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Period</dt>
                <dd className="font-medium">{rental.startDate} to {rental.endDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Duration</dt>
                <dd className="font-medium">{rental.durationDays} days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Daily price</dt>
                <dd className="font-medium">{formatSar(rental.dailyPriceHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd>{formatSar(rental.rentalSubtotalHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Platform fee</dt>
                <dd>{formatSar(rental.platformFeeHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">VAT (15%)</dt>
                <dd>{formatSar(rental.vatHalalas)}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold">
                <dt>Total</dt>
                <dd className="text-amber-600">{formatSar(rental.totalPayableHalalas)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Legal Commitment
            </h2>
            {legal ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Status</dt>
                  <dd>
                    <Badge variant="outline">{legal.status}</Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Commitment</dt>
                  <dd className="font-medium">{formatSar(legal.commitmentHalalas)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Percentage</dt>
                  <dd className="font-medium">{legal.commitmentPct}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Version</dt>
                  <dd>{legal.contractVersion}</dd>
                </div>
                {legal.signedAt && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Signed</dt>
                    <dd>{relativeTime(legal.signedAt)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Sanad */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Nafith Sanad
            </h2>
            {sanad ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Status</dt>
                  <dd>
                    <Badge
                      className={
                        sanad.status === "active"
                          ? "bg-green-100 text-green-700"
                          : sanad.status === "discharged"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {sanad.status}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Principal</dt>
                  <dd className="font-medium">{formatSar(sanad.principalHalalas)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Due amount</dt>
                  <dd className="font-medium">{formatSar(sanad.dueHalalas)}</dd>
                </div>
                {sanad.nafithReference && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Nafith ref</dt>
                    <dd className="font-mono text-xs">{sanad.nafithReference}</dd>
                  </div>
                )}
                {sanad.maturityDate && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Maturity</dt>
                    <dd>{sanad.maturityDate}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">No Sanad issued yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payments
            </h2>
            {paymentsList.length === 0 ? (
              <p className="text-sm text-neutral-500">No payments recorded.</p>
            ) : (
              <div className="space-y-3">
                {paymentsList.map((p: Payment) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b border-neutral-100 pb-2"
                  >
                    <div>
                      <p className="font-medium capitalize">{p.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-neutral-500">
                        {p.gateway} · {p.status}
                        {p.capturedAt ? ` · ${relativeTime(p.capturedAt)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`font-bold ${
                        p.type === "refund"
                          ? "text-green-600"
                          : "text-neutral-900"
                      }`}
                    >
                      {p.type === "refund" ? "+" : ""}
                      {formatSar(p.amountHalalas)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="mt-6">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Timeline
          </h2>
          <div className="space-y-4">
            {[
              { date: rental.createdAt, label: "Rental created", icon: Calendar },
              rental.confirmedAt && {
                date: rental.confirmedAt,
                label: "Payment confirmed",
                icon: CreditCard,
              },
              rental.deliveredAt && {
                date: rental.deliveredAt,
                label: "Delivered to renter",
                icon: CheckCircle2,
              },
              rental.returnedAt && {
                date: rental.returnedAt,
                label: "Returned to platform",
                icon: Shield,
              },
              rental.closedAt && {
                date: rental.closedAt,
                label: "Rental closed",
                icon: CheckCircle2,
              },
            ]
              .filter(Boolean)
              .map((event: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <event.icon className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{event.label}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(event.date).toLocaleString("en-SA")}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
