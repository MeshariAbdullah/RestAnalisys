import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileSignature,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rentalsApi, formatSar, type LegalCommitment, type SanadRecord, type Payment } from "@/lib/api";
import Layout from "@/components/Layout";

const RENTAL_STEPS = [
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

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusTimeline({ current }: { current: string }) {
  const idx = RENTAL_STEPS.indexOf(current);
  const isCancelled = current === "cancelled";
  const isDispute = current === "in_dispute" || current === "enforcement";
  const isClosed = current.startsWith("closed");

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {RENTAL_STEPS.map((step, i) => {
        const done = idx >= 0 && i <= idx;
        const active = (isClosed && step === "closed") || step === current;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center min-w-[60px]">
              <div
                className={`w-3 h-3 rounded-full ${
                  active
                    ? "bg-amber-500 ring-2 ring-amber-200"
                    : done
                    ? "bg-green-500"
                    : "bg-neutral-200"
                }`}
              />
              <span className={`text-[9px] mt-1 text-center ${active ? "font-bold text-amber-700" : "text-neutral-400"}`}>
                {statusLabel(step)}
              </span>
            </div>
            {i < RENTAL_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 min-w-[12px] ${done && i < idx ? "bg-green-400" : "bg-neutral-200"}`} />
            )}
          </React.Fragment>
        );
      })}
      {(isCancelled || isDispute) && (
        <>
          <div className="flex-1 h-0.5 min-w-[12px] bg-red-200" />
          <div className="flex flex-col items-center min-w-[60px]">
            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200" />
            <span className="text-[9px] mt-1 text-center font-bold text-red-700">
              {statusLabel(current)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ClausesSection({ clauses }: { clauses: LegalCommitment["clausesJson"] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {clauses.map((c) => (
        <div key={c.id} className="border border-neutral-200 rounded-lg">
          <button
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
          >
            <div>
              <p className="text-sm font-medium">{c.titleEn}</p>
              <p className="text-xs text-neutral-500" dir="rtl">{c.titleAr}</p>
            </div>
            {expanded === c.id ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expanded === c.id && (
            <div className="px-4 pb-4 space-y-2 border-t border-neutral-100">
              <p className="text-sm text-neutral-700 mt-3">{c.bodyEn}</p>
              <p className="text-sm text-neutral-500" dir="rtl">{c.bodyAr}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => rentalsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto">
          <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">Could not load rental details.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/my-rentals")}>
            Back to My Rentals
          </Button>
        </div>
      </Layout>
    );
  }

  const { rental, legal, sanad, payments } = data;

  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
    "confirmed",
  ].includes(rental.status);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => setLocation("/my-rentals")}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Rentals
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold">Rental {rental.reference}</h1>
            <Badge className="mt-2 bg-amber-100 text-amber-800 border-0">
              {statusLabel(rental.status)}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 uppercase">Total</p>
            <p className="text-2xl font-bold">{formatSar(rental.totalPayableHalalas)}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <StatusTimeline current={rental.status} />
          </CardContent>
        </Card>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Period</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      {rental.startDate} - {rental.endDate} ({rental.durationDays} days)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Daily Rate</p>
                    <p className="text-sm font-medium">{formatSar(rental.dailyPriceHalalas)}</p>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs text-neutral-500 mb-2">Price breakdown</p>
                  <div className="space-y-1 text-sm">
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
                    <div className="flex justify-between font-bold pt-1 border-t border-neutral-100">
                      <span>Total</span>
                      <span>{formatSar(rental.totalPayableHalalas)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs text-neutral-500 mb-1">Legal commitment</p>
                  <p className="text-sm font-medium">
                    {formatSar(rental.legalCommitmentHalalas)} ({rental.legalCommitmentPct}%)
                  </p>
                </div>

                {canCancel && (
                  <div className="border-t border-neutral-100 pt-4">
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        const reason = prompt("Cancellation reason:");
                        if (reason) cancelMut.mutate(reason);
                      }}
                      disabled={cancelMut.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {cancelMut.isPending ? "Cancelling..." : "Cancel Rental"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal">
            <Card>
              <CardContent className="p-6 space-y-4">
                {legal ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <FileSignature className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium">Contract {legal.contractVersion}</p>
                        <Badge className="mt-0.5 border-0 bg-neutral-100 text-neutral-600 text-xs">
                          {statusLabel(legal.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-neutral-500">Commitment</p>
                        <p className="font-medium">{formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)</p>
                      </div>
                      {legal.signedAt && (
                        <div>
                          <p className="text-xs text-neutral-500">Signed</p>
                          <p className="font-medium">{new Date(legal.signedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {legal.clausesJson && legal.clausesJson.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-neutral-500 mb-2">Contract Clauses</p>
                        <ClausesSection clauses={legal.clausesJson} />
                      </div>
                    )}

                    {sanad && (
                      <div className="border-t border-neutral-100 pt-4 mt-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-medium">Nafith Sanad</p>
                            <Badge className="mt-0.5 border-0 bg-neutral-100 text-neutral-600 text-xs">
                              {statusLabel(sanad.status)}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          {sanad.nafithReference && (
                            <div>
                              <p className="text-xs text-neutral-500">Reference</p>
                              <p className="font-mono text-xs">{sanad.nafithReference}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-neutral-500">Principal</p>
                            <p className="font-medium">{formatSar(sanad.principalHalalas)}</p>
                          </div>
                          {sanad.maturityDate && (
                            <div>
                              <p className="text-xs text-neutral-500">Maturity</p>
                              <p className="font-medium">{sanad.maturityDate}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    No legal commitment for this rental yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardContent className="p-6">
                {payments && payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((p: Payment) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between border border-neutral-100 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-neutral-400" />
                          <div>
                            <p className="text-sm font-medium">
                              {p.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {p.gateway} {p.invoiceNumber ? `#${p.invoiceNumber}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatSar(p.amountHalalas)}</p>
                          <Badge className={`text-xs border-0 ${
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "refunded"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-neutral-100 text-neutral-600"
                          }`}>
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">No payments recorded.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
