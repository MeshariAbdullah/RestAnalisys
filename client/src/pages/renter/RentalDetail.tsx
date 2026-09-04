import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  FileText,
  Shield,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { getRentalStatusLabel, getRentalStatusColor, formatDate } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${getRentalStatusColor(status)} hover:opacity-90 border-0`}>
      {getRentalStatusLabel(status)}
    </Badge>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  const statusColor =
    payment.status === "captured"
      ? "text-green-600"
      : payment.status === "pending"
        ? "text-amber-600"
        : "text-neutral-500";

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium capitalize">{payment.type.replace(/_/g, " ")}</p>
        <p className="text-xs text-neutral-500">
          {formatDate(payment.createdAt)}
          {payment.invoiceNumber && ` — Invoice ${payment.invoiceNumber}`}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatSar(payment.amountHalalas)}</p>
        <p className={`text-xs ${statusColor}`}>{payment.status}</p>
      </div>
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<"damage" | "loss" | "fraud" | "service" | "billing">("service");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rental-detail", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => rentalsApi.cancel(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental-detail", id] }),
    onError: (err: Error) => setError(err.message),
  });

  const disputeMutation = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId: id,
        category: disputeCategory,
        summary: disputeSummary,
      }),
    onSuccess: () => {
      setDisputeOpen(false);
      setDisputeSummary("");
      queryClient.invalidateQueries({ queryKey: ["rental-detail", id] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-neutral-500">Rental not found.</p>
      </div>
    );
  }

  const { rental, legal, sanad, payments: paymentsList } = data;
  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);
  const canDispute = ["active", "under_inspection", "closed", "closed_with_penalty"].includes(
    rental.status
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{rental.reference}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {rental.startDate} &rarr; {rental.endDate} ({rental.durationDays} days)
          </p>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pricing summary */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pricing
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-neutral-500">Daily rate</p>
              <p className="font-semibold">{formatSar(rental.dailyPriceHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Subtotal</p>
              <p className="font-semibold">{formatSar(rental.rentalSubtotalHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Platform fee</p>
              <p className="font-semibold">{formatSar(rental.platformFeeHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">VAT (15%)</p>
              <p className="font-semibold">{formatSar(rental.vatHalalas)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="font-medium">Total payable</p>
            <p className="text-xl font-bold">{formatSar(rental.totalPayableHalalas)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Legal Commitment
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <Badge
                  className={
                    legal.status === "signed" || legal.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }
                >
                  {legal.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Commitment amount</p>
                <p className="font-semibold">
                  {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                </p>
              </div>
              {legal.signedAt && (
                <div>
                  <p className="text-xs text-neutral-500">Signed at</p>
                  <p className="text-sm">{formatDate(legal.signedAt)}</p>
                </div>
              )}
            </div>
            {legal.status === "pending_signature" && (
              <div className="mt-4">
                <Link href={`/legal/${legal.id}`}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <FileText className="w-4 h-4 mr-1" />
                    Sign Contract
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Nafith Sanad
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <Badge
                  className={
                    sanad.status === "active" || sanad.status === "discharged"
                      ? "bg-green-100 text-green-800"
                      : sanad.status === "under_execution"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }
                >
                  {sanad.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {sanad.nafithReference && (
                <div>
                  <p className="text-xs text-neutral-500">Reference</p>
                  <p className="font-mono text-sm">{sanad.nafithReference}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-neutral-500">Principal</p>
                <p className="font-semibold">{formatSar(sanad.principalHalalas)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Maturity</p>
                <p className="text-sm">{sanad.maturityDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {paymentsList.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment History
            </h2>
            {paymentsList.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap mt-6">
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              const reason = window.prompt("Reason for cancellation:");
              if (reason) cancelMutation.mutate(reason);
            }}
            disabled={cancelMutation.isPending}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Cancel Rental
          </Button>
        )}

        {canDispute && !disputeOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisputeOpen(true)}
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Open Dispute
          </Button>
        )}
      </div>

      {/* Dispute form */}
      {disputeOpen && (
        <Card className="mt-4">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Open a Dispute</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value as typeof disputeCategory)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                >
                  <option value="damage">Damage</option>
                  <option value="loss">Loss</option>
                  <option value="fraud">Fraud</option>
                  <option value="service">Service</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Summary</label>
                <textarea
                  value={disputeSummary}
                  onChange={(e) => setDisputeSummary(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="Describe the issue..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => disputeMutation.mutate()}
                  disabled={!disputeSummary.trim() || disputeMutation.isPending}
                >
                  Submit Dispute
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDisputeOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
