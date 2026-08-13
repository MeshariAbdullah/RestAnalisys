import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Truck, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const ACTIONABLE_STATUSES = [
  "confirmed",
  "out_for_delivery",
  "active",
  "return_in_transit",
  "under_inspection",
];

function statusColor(s: string): string {
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "closed" || s === "closed_with_penalty")
    return "bg-green-100 text-green-700";
  if (s === "cancelled") return "bg-neutral-200 text-neutral-600";
  if (s.includes("enforcement") || s.includes("dispute"))
    return "bg-red-100 text-red-700";
  if (s === "confirmed") return "bg-blue-100 text-blue-700";
  if (s === "out_for_delivery") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-800";
}

function nextAction(status: string): { label: string; action: string } | null {
  switch (status) {
    case "confirmed":
      return { label: "Schedule delivery", action: "fulfill" };
    case "out_for_delivery":
      return { label: "Mark delivered", action: "delivered" };
    case "active":
      return { label: "Mark returned", action: "returned" };
    case "return_in_transit":
      return { label: "Mark returned", action: "returned" };
    case "under_inspection":
      return { label: "Close rental", action: "close" };
    default:
      return null;
  }
}

export default function RentalManagement() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<string>("clean");
  const [penaltySar, setPenaltySar] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-rentals"],
    queryFn: () => rentalsApi.list(),
  });

  const filtered =
    statusFilter === "all"
      ? data ?? []
      : statusFilter === "actionable"
      ? (data ?? []).filter((r) => ACTIONABLE_STATUSES.includes(r.status))
      : (data ?? []).filter((r) => r.status === statusFilter);

  async function handleAction(rental: Rental, action: string) {
    setError(null);
    try {
      if (action === "fulfill") {
        await rentalsApi.fulfill(rental.id);
      } else if (action === "delivered") {
        await rentalsApi.delivered(rental.id);
      } else if (action === "returned") {
        await rentalsApi.returned(rental.id);
      } else if (action === "close") {
        setClosingId(rental.id);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["all-rentals"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleClose(rentalId: number) {
    setError(null);
    try {
      const penaltyHalalas = penaltySar ? Math.round(Number(penaltySar) * 100) : undefined;
      await rentalsApi.close(
        rentalId,
        closeOutcome as "clean" | "penalty" | "major_damage" | "loss",
        penaltyHalalas
      );
      setClosingId(null);
      setPenaltySar("");
      setCloseOutcome("clean");
      await qc.invalidateQueries({ queryKey: ["all-rentals"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental management</h1>
      <p className="text-neutral-500 mb-6">
        Manage the rental lifecycle: fulfill, deliver, process returns and close.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rentals</SelectItem>
            <SelectItem value="actionable">Actionable only</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="under_inspection">Under inspection</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-neutral-500">
          {filtered.length} rental{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No rentals match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: Rental) => {
            const action = nextAction(r.status);
            return (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      {r.status === "out_for_delivery" ? (
                        <Truck className="w-5 h-5 text-amber-600" />
                      ) : r.status === "under_inspection" ? (
                        <RotateCcw className="w-5 h-5 text-amber-600" />
                      ) : r.status === "closed" || r.status === "closed_with_penalty" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Package className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold font-mono text-sm">
                          {r.reference}
                        </p>
                        <Badge className={`border-0 ${statusColor(r.status)}`}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600 mt-1">
                        {r.startDate} → {r.endDate} · {r.durationDays} days ·{" "}
                        {formatSar(r.totalPayableHalalas)}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Renter #{r.renterId} · Owner #{r.ownerId} · Asset #{r.assetId}
                      </p>
                    </div>
                    {action && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(r, action.action)}
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      >
                        {action.label}
                      </Button>
                    )}
                  </div>

                  {closingId === r.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-semibold">Close rental</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Select value={closeOutcome} onValueChange={setCloseOutcome}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clean">Clean return</SelectItem>
                            <SelectItem value="penalty">Minor penalty</SelectItem>
                            <SelectItem value="major_damage">Major damage</SelectItem>
                            <SelectItem value="loss">Loss / not returned</SelectItem>
                          </SelectContent>
                        </Select>
                        {closeOutcome === "penalty" && (
                          <Input
                            type="number"
                            placeholder="Penalty amount (SAR)"
                            value={penaltySar}
                            onChange={(e) => setPenaltySar(e.target.value)}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleClose(r.id)}
                            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                          >
                            Confirm close
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setClosingId(null)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
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
