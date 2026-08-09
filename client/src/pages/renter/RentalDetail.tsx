import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Truck,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_legal_signing: "bg-amber-100 text-amber-800",
    pending_payment: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-700",
    out_for_delivery: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    return_in_transit: "bg-blue-100 text-blue-700",
    under_inspection: "bg-amber-100 text-amber-800",
    closed: "bg-green-100 text-green-700",
    closed_with_penalty: "bg-red-100 text-red-700",
    cancelled: "bg-neutral-200 text-neutral-600",
    in_dispute: "bg-red-100 text-red-700",
    enforcement: "bg-red-100 text-red-700",
  };
  return (
    <Badge className={`${colors[status] ?? "bg-neutral-200 text-neutral-700"} border-0`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const payMutation = useMutation({
    mutationFn: () => paymentsApi.charge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => rentalsApi.cancel(id, "Cancelled by renter"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-red-600">Failed to load rental details.</p>
      </div>
    );
  }

  const { rental, legal, sanad, payments: pays } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <button className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </button>
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Rental period
            </h3>
            <p className="font-semibold">
              {rental.startDate} → {rental.endDate}
            </p>
            <p className="text-sm text-neutral-500">{rental.durationDays} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-4">
              Pricing
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Daily rate</span>
                <span>{formatSar(rental.dailyPriceHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Platform fee</span>
                <span>{formatSar(rental.platformFeeHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">VAT (15%)</span>
                <span>{formatSar(rental.vatHalalas)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {legal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold">Legal commitment</h3>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Status</span>
                <StatusBadge status={legal.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Commitment amount</span>
                <span className="font-semibold">
                  {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                </span>
              </div>
              {legal.signedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Signed at</span>
                  <span>{new Date(legal.signedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
            {rental.status === "pending_legal_signing" && (
              <Link href={`/legal/${legal.id}`}>
                <Button className="mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                  <Shield className="w-4 h-4 mr-2" />
                  Review & sign contract
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Sanad (Promissory note)</h3>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Status</span>
                <StatusBadge status={sanad.status} />
              </div>
              {sanad.nafithReference && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Nafith ref</span>
                  <span className="font-mono text-xs">{sanad.nafithReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Principal</span>
                <span>{formatSar(sanad.principalHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Maturity</span>
                <span>{sanad.maturityDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pays && pays.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Payments</h3>
            </div>
            <div className="space-y-3">
              {pays.map((p: Payment) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium">{p.type.replace(/_/g, " ")}</span>
                    <span className="text-neutral-500 ml-2">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatSar(p.amountHalalas)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        {rental.status === "pending_payment" && (
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            className="bg-green-600 text-white hover:bg-green-500"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {payMutation.isPending ? "Processing..." : "Pay now"}
          </Button>
        )}
        {["pending_legal_signing", "pending_payment", "pending_risk_review"].includes(
          rental.status
        ) && (
          <Button
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Cancel rental
          </Button>
        )}
      </div>

      {(payMutation.error || cancelMutation.error) && (
        <p className="text-red-600 text-sm mt-4">
          {(payMutation.error as Error)?.message ?? (cancelMutation.error as Error)?.message}
        </p>
      )}
    </div>
  );
}
