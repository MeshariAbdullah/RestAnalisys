import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Shield,
  CreditCard,
  FileSignature,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar } from "@/lib/api";
import { toast } from "@/lib/useToast";
import Layout from "@/components/Layout";

const CANCELLABLE = ["pending_risk_review", "pending_legal_signing", "pending_payment"];

function statusVariant(status: string) {
  if (status === "closed" || status === "active") return "success" as const;
  if (status.includes("cancel") || status.includes("dispute") || status.includes("enforcement"))
    return "error" as const;
  return "warning" as const;
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMut = useMutation({
    mutationFn: () => rentalsApi.cancel(id, cancelReason),
    onSuccess: () => {
      toast({ title: "Rental cancelled", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowCancel(false);
    },
    onError: (e: Error) => {
      toast({ title: "Cancel failed", description: e.message, variant: "error" });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
          Failed to load rental details.
        </div>
      </Layout>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = CANCELLABLE.includes(rental.status);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/my-rentals")}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to rentals
        </button>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
            <h1 className="text-2xl font-bold mt-1">Rental details</h1>
          </div>
          <Badge variant={statusVariant(rental.status)} className="text-sm px-3 py-1">
            {rental.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Dates & Duration */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 mb-3">
              <Calendar className="w-4 h-4" /> Rental period
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Start</p>
                <p className="font-medium">{rental.startDate}</p>
              </div>
              <div>
                <p className="text-neutral-500">End</p>
                <p className="font-medium">{rental.endDate}</p>
              </div>
              <div>
                <p className="text-neutral-500">Duration</p>
                <p className="font-medium">{rental.durationDays} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Breakdown */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 mb-3">
              <CreditCard className="w-4 h-4" /> Pricing breakdown
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label={`Subtotal (${rental.durationDays} days)`} value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Commitment */}
        {legal && (
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 mb-3">
                <FileSignature className="w-4 h-4" /> Legal commitment
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Commitment" value={`${formatSar(legal.commitmentHalalas)} (${legal.commitmentPct}%)`} />
                <Row label="Contract version" value={legal.contractVersion} />
                {legal.signedAt && <Row label="Signed" value={new Date(legal.signedAt).toLocaleString()} />}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sanad Status */}
        {sanad && (
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 mb-3">
                <Shield className="w-4 h-4" /> Sanad (promissory note)
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                <Row label="Maturity" value={sanad.maturityDate} />
                {sanad.nafithReference && <Row label="Nafith ref" value={sanad.nafithReference} />}
                {sanad.executionCaseNumber && (
                  <Row label="Execution case" value={sanad.executionCaseNumber} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        {payments.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 mb-3">
                <CreditCard className="w-4 h-4" /> Payment history
              </div>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{p.type.replace(/_/g, " ")}</span>
                      <span className="text-neutral-400 ml-2">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{formatSar(p.amountHalalas)}</span>
                      <Badge variant={p.status === "captured" ? "success" : p.status === "failed" ? "error" : "warning"}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel */}
        {canCancel && (
          <Card className="border-red-200">
            <CardContent className="p-6">
              {!showCancel ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancel(true)}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" /> Cancel this rental
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Why are you cancelling?</p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter cancellation reason (min 3 characters)"
                    className="w-full border rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      disabled={cancelReason.length < 3 || cancelMut.isPending}
                      onClick={() => cancelMut.mutate()}
                    >
                      {cancelMut.isPending ? "Cancelling..." : "Confirm cancellation"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCancel(false)}>
                      Keep rental
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
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
