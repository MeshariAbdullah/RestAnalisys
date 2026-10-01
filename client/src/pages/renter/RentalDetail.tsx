import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  FileText,
  CreditCard,
  XCircle,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const DISPUTE_CATEGORIES = [
  { value: "damage", label: "Damage" },
  { value: "loss", label: "Loss" },
  { value: "fraud", label: "Fraud" },
  { value: "service", label: "Service issue" },
  { value: "billing", label: "Billing" },
] as const;

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  captured: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-800",
  refunded: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
};

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [showDispute, setShowDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowCancel(false);
      setCancelReason("");
    } catch (err) {
      setError((err as Error).message ?? "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  async function handleOpenDispute() {
    setSubmittingDispute(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      });
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowDispute(false);
      setDisputeCategory("");
      setDisputeSummary("");
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setSubmittingDispute(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-neutral-100 rounded animate-pulse" />
        <div className="h-40 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="h-56 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="h-32 bg-neutral-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>Unable to load rental details.</p>
            <button
              onClick={() => navigate("/my-rentals")}
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Back to my rentals
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = rental.status === "draft" || rental.status === "pending_payment";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Date range */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
            <CalendarDays className="w-4 h-4" />
            Rental period
          </div>
          <p className="font-semibold text-lg">
            {rental.startDate} → {rental.endDate}{" "}
            <span className="text-neutral-500 font-normal text-base">
              ({rental.durationDays} days)
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Financial breakdown */}
      <Card className="mb-4 border-amber-200 bg-amber-50/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
            <CreditCard className="w-4 h-4" />
            Financial breakdown
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>
                Daily price ({formatSar(rental.dailyPriceHalalas)} x{" "}
                {rental.durationDays} days)
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
            <div className="flex justify-between font-bold text-base pt-3 border-t border-amber-200">
              <span>Total payable</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
            <div className="flex justify-between text-neutral-600 pt-2">
              <span>
                Legal commitment ({rental.legalCommitmentPct}%)
              </span>
              <span className="font-semibold text-amber-700">
                {formatSar(rental.legalCommitmentHalalas)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
              <FileText className="w-4 h-4" />
              Legal commitment
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Badge
                className={
                  legal.status === "signed"
                    ? "bg-green-100 text-green-700 border-0"
                    : "bg-amber-100 text-amber-800 border-0"
                }
              >
                {legal.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-neutral-500">
                Contract v{legal.contractVersion}
              </span>
              {legal.signedAt && (
                <span className="text-xs text-neutral-500">
                  Signed {legal.signedAt}
                </span>
              )}
            </div>
            {legal.clausesJson.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                {legal.clausesJson.map((clause, i) => (
                  <div key={clause.id} className="text-sm">
                    <p className="font-medium">
                      {i + 1}. {clause.titleEn}
                    </p>
                    <p className="text-neutral-600 text-xs mt-0.5 line-clamp-2">
                      {clause.bodyEn}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
              <ShieldAlert className="w-4 h-4" />
              Sanad (promissory note)
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Badge
                className={
                  sanad.status === "active"
                    ? "bg-green-100 text-green-700 border-0"
                    : sanad.status === "discharged"
                      ? "bg-neutral-200 text-neutral-600 border-0"
                      : "bg-red-100 text-red-700 border-0"
                }
              >
                {sanad.status.replace(/_/g, " ")}
              </Badge>
              {sanad.nafithReference && (
                <span className="text-xs text-neutral-500 font-mono">
                  Nafith: {sanad.nafithReference}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Principal</p>
                <p className="font-semibold mt-1">
                  {formatSar(sanad.principalHalalas)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Due</p>
                <p className="font-semibold mt-1">
                  {formatSar(sanad.dueHalalas)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Maturity</p>
                <p className="font-semibold mt-1">{sanad.maturityDate}</p>
              </div>
            </div>
            {sanad.executionCaseNumber && (
              <p className="text-xs text-red-600 mt-3">
                Execution case: {sanad.executionCaseNumber}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
              <CreditCard className="w-4 h-4" />
              Payment history
            </div>
            <div className="space-y-3">
              {payments.map((p: Payment) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border-b last:border-0 pb-3 last:pb-0"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {p.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {p.gateway} · {p.createdAt}
                    </p>
                    {p.invoiceNumber && (
                      <p className="text-xs text-neutral-500 font-mono">
                        Invoice {p.invoiceNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                    <Badge
                      className={`${
                        PAYMENT_STATUS_COLOR[p.status] ??
                        "bg-neutral-100 text-neutral-600"
                      } border-0 text-[11px]`}
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

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {/* Cancel form */}
      {canCancel && !showCancel && (
        <Button
          variant="outline"
          className="mr-3 border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => {
            setShowCancel(true);
            setError(null);
          }}
        >
          <XCircle className="w-4 h-4 mr-1" />
          Cancel rental
        </Button>
      )}

      {showCancel && (
        <Card className="mb-4 border-red-200">
          <CardContent className="p-6">
            <p className="font-semibold text-red-800 mb-3">Cancel this rental</p>
            <Input
              placeholder="Reason for cancellation"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="bg-red-600 text-white hover:bg-red-500"
              >
                {cancelling ? "Cancelling..." : "Confirm cancellation"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancel(false);
                  setCancelReason("");
                  setError(null);
                }}
              >
                Keep rental
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute button & form */}
      {!showDispute && (
        <Button
          variant="outline"
          onClick={() => {
            setShowDispute(true);
            setError(null);
          }}
        >
          <AlertCircle className="w-4 h-4 mr-1" />
          Open dispute
        </Button>
      )}

      {showDispute && (
        <Card className="mt-4 border-amber-200">
          <CardContent className="p-6">
            <p className="font-semibold mb-3">Open a dispute</p>
            <div className="space-y-3">
              <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Describe the issue..."
                value={disputeSummary}
                onChange={(e) => setDisputeSummary(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleOpenDispute}
                  disabled={
                    submittingDispute ||
                    !disputeCategory ||
                    !disputeSummary.trim()
                  }
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {submittingDispute ? "Submitting..." : "Submit dispute"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDispute(false);
                    setDisputeCategory("");
                    setDisputeSummary("");
                    setError(null);
                  }}
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
