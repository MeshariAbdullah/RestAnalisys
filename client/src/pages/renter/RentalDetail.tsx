import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Shield,
  CreditCard,
  ArrowLeft,
  FileSignature,
  Calendar,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar } from "@/lib/api";
import { getRentalStatusColor, humanizeStatus, formatDate } from "@/lib/utils";

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) return <div className="p-8">Loading rental…</div>;
  if (!data) return <div className="p-8">Rental not found.</div>;

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </a>
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${getRentalStatusColor(rental.status)} border-0 text-sm`}>
          {humanizeStatus(rental.status)}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-lg">Rental period</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500 text-xs uppercase">Start</p>
                  <p className="font-medium mt-1">{rental.startDate}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs uppercase">End</p>
                  <p className="font-medium mt-1">{rental.endDate}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs uppercase">Duration</p>
                  <p className="font-medium mt-1">{rental.durationDays} days</p>
                </div>
              </div>

              {(rental.confirmedAt || rental.deliveredAt || rental.returnedAt || rental.closedAt) && (
                <div className="mt-6 border-t pt-4">
                  <p className="text-xs text-neutral-500 uppercase mb-3">Timeline</p>
                  <div className="space-y-2 text-sm">
                    {rental.confirmedAt && (
                      <TimelineItem label="Confirmed" date={rental.confirmedAt} />
                    )}
                    {rental.deliveredAt && (
                      <TimelineItem label="Delivered" date={rental.deliveredAt} />
                    )}
                    {rental.returnedAt && (
                      <TimelineItem label="Returned" date={rental.returnedAt} />
                    )}
                    {rental.closedAt && (
                      <TimelineItem label="Closed" date={rental.closedAt} />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {legal && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileSignature className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-lg">Legal commitment</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Row label="Status" value={humanizeStatus(legal.status)} />
                  <Row label="Version" value={legal.contractVersion} />
                  <Row
                    label="Commitment"
                    value={`${formatSar(legal.commitmentHalalas)} (${legal.commitmentPct}%)`}
                  />
                  {legal.signedAt && (
                    <Row label="Signed" value={formatDate(legal.signedAt)} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {sanad && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-lg">Sanad (promissory note)</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Row label="Status" value={humanizeStatus(sanad.status)} />
                  {sanad.nafithReference && (
                    <Row label="Nafith ref" value={sanad.nafithReference} />
                  )}
                  <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                  <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                  {sanad.maturityDate && (
                    <Row label="Maturity" value={sanad.maturityDate} />
                  )}
                  {sanad.executionCaseNumber && (
                    <Row label="Najiz case" value={sanad.executionCaseNumber} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-lg">Payments</h2>
                </div>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{humanizeStatus(p.type)}</p>
                        <p className="text-xs text-neutral-500">
                          {p.gateway} {p.gatewayTransactionId ? `· ${p.gatewayTransactionId}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                        <Badge
                          className={`text-xs border-0 ${
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
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

        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
            <CardContent className="p-6 space-y-3 text-sm">
              <p className="text-xs uppercase text-neutral-500 font-medium">
                Pricing breakdown
              </p>
              <Row
                label={`${formatSar(rental.dailyPriceHalalas)} x ${rental.durationDays} days`}
                value={formatSar(rental.rentalSubtotalHalalas)}
              />
              <Row
                label="Platform fee"
                value={formatSar(rental.platformFeeHalalas)}
              />
              <Row label="VAT 15%" value={formatSar(rental.vatHalalas)} />
              <div className="border-t border-amber-200 pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3 text-sm">
              <p className="text-xs uppercase text-neutral-500 font-medium">
                Risk snapshot
              </p>
              <Row
                label="Trust score at booking"
                value={rental.trustScoreAtBooking ?? "N/A"}
              />
              <Row
                label="Commitment"
                value={`${rental.legalCommitmentPct}%`}
              />
              <Row
                label="Commitment amount"
                value={formatSar(rental.legalCommitmentHalalas)}
              />
            </CardContent>
          </Card>

          {rental.status === "pending_legal_signing" && legal && (
            <Link href={`/legal/${legal.id}`}>
              <Button className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400">
                <FileText className="w-4 h-4 mr-1.5" />
                Sign contract
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      <span className="text-neutral-600 w-24">{label}</span>
      <span className="text-neutral-500">{formatDate(date)}</span>
    </div>
  );
}
