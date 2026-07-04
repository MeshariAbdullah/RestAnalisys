import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle,
  RotateCcw,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const ACTIONABLE_STATUSES = [
  "confirmed",
  "out_for_delivery",
  "active",
  "return_in_transit",
  "under_inspection",
];

function nextAction(
  status: string
): {
  label: string;
  action: string;
  icon: typeof Truck;
  color: string;
} | null {
  switch (status) {
    case "confirmed":
      return {
        label: "Fulfill (send to renter)",
        action: "fulfill",
        icon: Truck,
        color: "bg-blue-600 hover:bg-blue-700",
      };
    case "out_for_delivery":
      return {
        label: "Mark delivered",
        action: "delivered",
        icon: CheckCircle,
        color: "bg-green-600 hover:bg-green-700",
      };
    case "active":
    case "return_in_transit":
      return {
        label: "Mark returned",
        action: "returned",
        icon: RotateCcw,
        color: "bg-amber-600 hover:bg-amber-700",
      };
    case "under_inspection":
      return {
        label: "Close rental…",
        action: "close",
        icon: XCircle,
        color: "bg-red-600 hover:bg-red-700",
      };
    default:
      return null;
  }
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-amber-100 text-amber-700",
  under_inspection: "bg-amber-100 text-amber-700",
  closed: "bg-neutral-200 text-neutral-600",
  closed_with_penalty: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-200 text-neutral-500",
};

export default function OpsRentals() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("actionable");
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<string>("clean");
  const [penaltySar, setPenaltySar] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-rentals"],
    queryFn: () => rentalsApi.list(),
  });

  const filtered = (data ?? []).filter((r: Rental) => {
    if (filter === "actionable") return ACTIONABLE_STATUSES.includes(r.status);
    if (filter === "all") return true;
    return r.status === filter;
  });

  async function handleAction(rental: Rental, action: string) {
    if (action === "close") {
      setClosingId(rental.id);
      return;
    }

    setLoadingAction(rental.id);
    setActionError(null);
    try {
      if (action === "fulfill") await rentalsApi.fulfill(rental.id);
      else if (action === "delivered") await rentalsApi.delivered(rental.id);
      else if (action === "returned") await rentalsApi.returned(rental.id);
      await qc.invalidateQueries({ queryKey: ["all-rentals"] });
    } catch (err) {
      setActionError(`${rental.reference}: ${(err as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleClose() {
    if (!closingId) return;
    setLoadingAction(closingId);
    setActionError(null);
    try {
      const outcome = closeOutcome as
        | "clean"
        | "penalty"
        | "major_damage"
        | "loss";
      const penaltyHalalas =
        outcome === "penalty" ? Math.round(Number(penaltySar) * 100) : undefined;
      await rentalsApi.close(closingId, outcome, penaltyHalalas);
      setClosingId(null);
      setCloseOutcome("clean");
      setPenaltySar("");
      await qc.invalidateQueries({ queryKey: ["all-rentals"] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental management</h1>
      <p className="text-neutral-500 mb-6">
        Advance rentals through their lifecycle: fulfill, deliver, return, close.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: "actionable", label: "Actionable" },
          { id: "all", label: "All" },
          { id: "confirmed", label: "Confirmed" },
          { id: "active", label: "Active" },
          { id: "under_inspection", label: "Under inspection" },
          { id: "closed", label: "Closed" },
        ].map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.id)}
            className={filter === f.id ? "bg-neutral-900 text-white" : ""}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {actionError}
        </div>
      )}

      {closingId && (
        <Card className="mb-6 border-amber-300 bg-amber-50/40">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Close rental</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Outcome
                </label>
                <Select value={closeOutcome} onValueChange={setCloseOutcome}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Clean return</SelectItem>
                    <SelectItem value="penalty">Minor damage (penalty)</SelectItem>
                    <SelectItem value="major_damage">Major damage</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {closeOutcome === "penalty" && (
                <div>
                  <label className="text-sm text-neutral-600 block mb-1">
                    Penalty amount (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={penaltySar}
                    onChange={(e) => setPenaltySar(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. 500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                disabled={loadingAction === closingId}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loadingAction === closingId ? "Closing…" : "Confirm close"}
              </Button>
              <Button variant="outline" onClick={() => setClosingId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No rentals match this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: Rental) => {
            const na = nextAction(r.status);
            const Icon = na?.icon ?? Clock;
            return (
              <Card key={r.id}>
                <CardContent className="p-5 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-neutral-500">
                        {r.reference}
                      </span>
                      <Badge
                        className={`${
                          STATUS_COLORS[r.status] ?? "bg-neutral-200 text-neutral-600"
                        } border-0`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {r.startDate} → {r.endDate}{" "}
                      <span className="text-neutral-500">
                        ({r.durationDays}d)
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Total: {formatSar(r.totalPayableHalalas)} · Commitment:{" "}
                      {formatSar(r.legalCommitmentHalalas)}
                    </p>
                  </div>
                  {na && (
                    <Button
                      onClick={() => handleAction(r, na.action)}
                      disabled={loadingAction === r.id}
                      className={`${na.color} text-white shrink-0`}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {loadingAction === r.id ? "…" : na.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
