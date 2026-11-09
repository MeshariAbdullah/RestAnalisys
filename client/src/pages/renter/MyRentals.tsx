import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rentalsApi, disputesApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    color: "bg-neutral-200 text-neutral-700",
    icon: Clock,
  };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const DISPUTABLE_STATUSES = [
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
  "closed_with_penalty",
];

export default function MyRentals() {
  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {isLoading ? (
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
          {data.map((r: Rental) => (
            <RentalCard key={r.id} rental={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  const [showDispute, setShowDispute] = useState(false);
  const canDispute = DISPUTABLE_STATUSES.includes(rental.status);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-neutral-500">
              {rental.reference}
            </p>
            <p className="font-semibold mt-1">
              {rental.startDate} → {rental.endDate}{" "}
              <span className="text-neutral-500 font-normal">
                ({rental.durationDays} days)
              </span>
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <StatusBadge status={rental.status} />
              {canDispute && !showDispute && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowDispute(true)}
                >
                  <Flag className="w-3 h-3 mr-1" />
                  Open dispute
                </Button>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 uppercase">Total paid</p>
            <p className="font-bold text-lg">
              {formatSar(rental.totalPayableHalalas)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Commitment {formatSar(rental.legalCommitmentHalalas)} (
              {rental.legalCommitmentPct}%)
            </p>
          </div>
        </div>
        {showDispute && (
          <DisputeForm
            rentalId={rental.id}
            onClose={() => setShowDispute(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function DisputeForm({
  rentalId,
  onClose,
}: {
  rentalId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("");
  const [summary, setSummary] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId,
        category: category as "damage" | "loss" | "fraud" | "service" | "billing",
        summary,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      onClose();
    },
  });

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <p className="text-sm font-semibold">Open a dispute</p>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Category…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="damage">Damage</SelectItem>
          <SelectItem value="loss">Loss</SelectItem>
          <SelectItem value="fraud">Fraud</SelectItem>
          <SelectItem value="service">Service</SelectItem>
          <SelectItem value="billing">Billing</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Describe the issue (min 10 characters)…"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!category || summary.length < 10 || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Submitting…" : "Submit dispute"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
      {mut.isError && (
        <p className="text-red-600 text-xs">
          {(mut.error as Error).message}
        </p>
      )}
    </div>
  );
}
