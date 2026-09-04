import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  RotateCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  rentalsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { getRentalStatusLabel, getRentalStatusColor } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${getRentalStatusColor(status)} hover:opacity-90 border-0`}>
      {getRentalStatusLabel(status)}
    </Badge>
  );
}

function ActionPanel({
  rental,
  onAction,
  loading,
}: {
  rental: Rental;
  onAction: (action: string, extra?: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [outcome, setOutcome] = useState<"clean" | "penalty" | "major_damage" | "loss">("clean");
  const [penaltyAmount, setPenaltyAmount] = useState("");

  switch (rental.status) {
    case "confirmed":
      return (
        <Button
          size="sm"
          onClick={() => onAction("fulfill")}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Truck className="w-4 h-4 mr-1" />
          Schedule Delivery
        </Button>
      );

    case "out_for_delivery":
      return (
        <Button
          size="sm"
          onClick={() => onAction("delivered")}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Mark Delivered
        </Button>
      );

    case "active":
    case "return_in_transit":
      return (
        <Button
          size="sm"
          onClick={() => onAction("returned")}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Mark Returned
        </Button>
      );

    case "under_inspection":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Close outcome:</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="clean">Clean return</option>
              <option value="penalty">Minor penalty</option>
              <option value="major_damage">Major damage</option>
              <option value="loss">Loss</option>
            </select>
          </div>
          {outcome === "penalty" && (
            <input
              type="number"
              placeholder="Penalty amount (SAR)"
              value={penaltyAmount}
              onChange={(e) => setPenaltyAmount(e.target.value)}
              className="text-sm border rounded px-2 py-1 w-40"
            />
          )}
          <Button
            size="sm"
            onClick={() =>
              onAction("close", {
                outcome,
                penaltyHalalas: outcome === "penalty" ? Number(penaltyAmount) * 100 : undefined,
              })
            }
            disabled={loading}
            className="bg-neutral-800 hover:bg-neutral-900"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Close Rental
          </Button>
        </div>
      );

    default:
      return null;
  }
}

function RentalRow({ rental: r }: { rental: Rental }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["rental-detail", r.id],
    queryFn: () => rentalsApi.get(r.id),
    enabled: expanded,
  });

  const mutation = useMutation({
    mutationFn: async ({
      action,
      extra,
    }: {
      action: string;
      extra?: Record<string, unknown>;
    }) => {
      setError("");
      switch (action) {
        case "fulfill":
          return rentalsApi.fulfill(r.id);
        case "delivered":
          return rentalsApi.delivered(r.id);
        case "returned":
          return rentalsApi.returned(r.id);
        case "close":
          return rentalsApi.close(
            r.id,
            extra!.outcome as "clean" | "penalty" | "major_damage" | "loss",
            extra?.penaltyHalalas as number | undefined
          );
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      queryClient.invalidateQueries({ queryKey: ["rental-detail", r.id] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const hasActions = [
    "confirmed",
    "out_for_delivery",
    "active",
    "return_in_transit",
    "under_inspection",
  ].includes(r.status);

  return (
    <Card>
      <CardContent className="p-5">
        <div
          className="flex items-start justify-between gap-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-sm mt-1">
              {r.startDate} &rarr; {r.endDate}
              <span className="text-neutral-400 ml-2">({r.durationDays} days)</span>
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <div>
              <p className="text-xs text-neutral-500">Total</p>
              <p className="font-semibold">{formatSar(r.totalPayableHalalas)}</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {detail.isLoading && (
              <div className="h-12 rounded bg-neutral-100 animate-pulse" />
            )}

            {detail.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-neutral-500 text-xs">Legal Status</p>
                  <p className="font-medium">
                    {detail.data.legal?.status ?? "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Commitment</p>
                  <p className="font-medium">
                    {formatSar(r.legalCommitmentHalalas)} ({r.legalCommitmentPct}%)
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Sanad</p>
                  <p className="font-medium">
                    {detail.data.sanad?.status ?? "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Payments</p>
                  <p className="font-medium">{detail.data.payments.length} records</p>
                </div>
              </div>
            )}

            {hasActions && (
              <div className="pt-2">
                <ActionPanel
                  rental={r}
                  onAction={(action, extra) => mutation.mutate({ action, extra })}
                  loading={mutation.isPending}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RentalManagement() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const filtered =
    data && statusFilter !== "all"
      ? data.filter((r) => r.status === statusFilter)
      : data;

  const actionableStatuses = [
    "confirmed",
    "out_for_delivery",
    "active",
    "return_in_transit",
    "under_inspection",
  ];
  const actionableCount =
    data?.filter((r) => actionableStatuses.includes(r.status)).length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
      <p className="text-neutral-500 mb-6">
        Manage the full rental lifecycle — fulfill, deliver, return, inspect, and close.
      </p>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            {actionableCount} rental{actionableCount !== 1 ? "s" : ""} need action
          </span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="active">Active</option>
          <option value="return_in_transit">Return in Transit</option>
          <option value="under_inspection">Under Inspection</option>
          <option value="closed">Closed</option>
          <option value="closed_with_penalty">Closed (Penalty)</option>
          <option value="in_dispute">In Dispute</option>
          <option value="enforcement">Enforcement</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No rentals found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: Rental) => (
            <RentalRow key={r.id} rental={r} />
          ))}
        </div>
      )}
    </div>
  );
}
