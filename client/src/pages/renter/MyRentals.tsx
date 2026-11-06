import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  XCircle,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  rentalsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: {
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

const CANCELLABLE = new Set([
  "pending_payment",
  "pending_legal_signing",
  "pending_risk_review",
]);

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

function RentalDetail({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental-detail", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading details…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-red-600 text-sm py-2">
        Failed to load rental details.
      </p>
    );
  }

  const { rental, legal, sanad, payments: pays } = data;

  async function handleCancel() {
    if (cancelReason.length < 3) {
      setActionError("Reason must be at least 3 characters.");
      return;
    }
    setCancelling(true);
    setActionError(null);
    try {
      await rentalsApi.cancel(rentalId, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      await qc.invalidateQueries({ queryKey: ["rental-detail", rentalId] });
      setShowCancelForm(false);
      setCancelReason("");
    } catch (e: any) {
      setActionError(e.message ?? "Failed to cancel rental");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-neutral-500 text-xs uppercase mb-1">Subtotal</p>
          <p className="font-semibold">
            {formatSar(rental.rentalSubtotalHalalas)}
          </p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs uppercase mb-1">
            Platform fee
          </p>
          <p className="font-semibold">
            {formatSar(rental.platformFeeHalalas)}
          </p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs uppercase mb-1">VAT (15%)</p>
          <p className="font-semibold">{formatSar(rental.vatHalalas)}</p>
        </div>
      </div>

      {sanad && (
        <div className="text-sm">
          <p className="text-neutral-500 text-xs uppercase mb-1">Sanad</p>
          <p>
            Status: <span className="font-medium">{sanad.status}</span>
            {sanad.nafithReference && (
              <span className="text-neutral-500 ml-2">
                Ref: {sanad.nafithReference}
              </span>
            )}
          </p>
        </div>
      )}

      {pays.length > 0 && (
        <div className="text-sm">
          <p className="text-neutral-500 text-xs uppercase mb-1">Payments</p>
          <div className="space-y-1">
            {pays.map((p: Payment) => (
              <div key={p.id} className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                <Badge variant="outline" className="text-xs">
                  {p.status}
                </Badge>
                <span className="text-neutral-500">{p.type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {legal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/legal/${legal.id}`)}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            View contract
          </Button>
        )}

        {CANCELLABLE.has(rental.status) && !showCancelForm && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowCancelForm(true)}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Cancel rental
          </Button>
        )}
      </div>

      {showCancelForm && (
        <div className="flex gap-2 items-start">
          <Input
            placeholder="Reason for cancellation…"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            disabled={cancelling}
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={handleCancel}
          >
            {cancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirm cancel"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCancelForm(false);
              setActionError(null);
            }}
          >
            Back
          </Button>
        </div>
      )}

      {actionError && (
        <p className="text-red-600 text-sm">{actionError}</p>
      )}
    </div>
  );
}

export default function MyRentals() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {error ? (
        <Card>
          <CardContent className="p-12 text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
            <p>Failed to load rentals. Please try again later.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't rented anything yet.</p>
            <a
              href="/browse"
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Browse the collection →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((r: Rental) => {
            const expanded = expandedId === r.id;
            return (
              <Card key={r.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                  >
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-neutral-500">
                          {r.reference}
                        </p>
                        <p className="font-semibold mt-1">
                          {r.startDate} → {r.endDate}{" "}
                          <span className="text-neutral-500 font-normal">
                            ({r.durationDays} days)
                          </span>
                        </p>
                        <div className="mt-3">
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="text-right">
                          <p className="text-xs text-neutral-500 uppercase">
                            Total paid
                          </p>
                          <p className="font-bold text-lg">
                            {formatSar(r.totalPayableHalalas)}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1">
                            Commitment {formatSar(r.legalCommitmentHalalas)} (
                            {r.legalCommitmentPct}%)
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp className="w-5 h-5 text-neutral-400 mt-1" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-neutral-400 mt-1" />
                        )}
                      </div>
                    </div>
                  </button>
                  {expanded && <RentalDetail rentalId={r.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
