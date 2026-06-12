import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_COLOR: Record<string, string> = {
  pending_risk_review: "bg-amber-100 text-amber-800",
  pending_legal_signing: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-amber-100 text-amber-800",
  under_inspection: "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-700",
  closed_with_penalty: "bg-red-100 text-red-700",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-200 text-neutral-600",
};

function getAction(rental: Rental): { label: string; action: string } | null {
  switch (rental.status) {
    case "confirmed":
      return { label: "Fulfill (ship)", action: "fulfill" };
    case "out_for_delivery":
      return { label: "Mark delivered", action: "delivered" };
    case "active":
      return { label: "Mark returned", action: "returned" };
    case "under_inspection":
      return { label: "Close rental", action: "close" };
    default:
      return null;
  }
}

export default function OpsRentals() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<string>("clean");
  const [penaltySar, setPenaltySar] = useState("");
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const filteredRentals = (data ?? []).filter((r: Rental) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.reference.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleAction(rental: Rental, action: string) {
    if (action === "close") {
      setClosingId(rental.id);
      return;
    }
    setLoading(rental.id);
    setError(null);
    try {
      if (action === "fulfill") await rentalsApi.fulfill(rental.id);
      else if (action === "delivered") await rentalsApi.delivered(rental.id);
      else if (action === "returned") await rentalsApi.returned(rental.id);
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function handleClose(rentalId: number) {
    setLoading(rentalId);
    setError(null);
    try {
      const outcome = closeOutcome as "clean" | "penalty" | "major_damage" | "loss";
      const penaltyHalalas = outcome === "penalty" ? Math.round(Number(penaltySar) * 100) : undefined;
      await rentalsApi.close(rentalId, outcome, penaltyHalalas);
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      setClosingId(null);
      setCloseOutcome("clean");
      setPenaltySar("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
      <p className="text-neutral-500 mb-6">
        Manage the rental lifecycle: fulfill, deliver, return and close.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search by reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="under_inspection">Under inspection</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="closed_with_penalty">Closed (penalty)</SelectItem>
            <SelectItem value="enforcement">Enforcement</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredRentals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No rentals found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRentals.map((rental: Rental) => {
            const actionDef = getAction(rental);
            const isClosing = closingId === rental.id;

            return (
              <Card key={rental.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs text-neutral-500">{rental.reference}</span>
                        <Badge className={`${STATUS_COLOR[rental.status] ?? "bg-neutral-200"} border-0`}>
                          {rental.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-6 mt-2 text-sm text-neutral-600">
                        <span>{rental.startDate} → {rental.endDate}</span>
                        <span>{rental.durationDays}d</span>
                        <span className="font-medium">{formatSar(rental.totalPayableHalalas)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {actionDef && !isClosing && (
                        <Button
                          size="sm"
                          disabled={loading === rental.id}
                          onClick={() => handleAction(rental, actionDef.action)}
                          className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        >
                          {loading === rental.id ? "Processing..." : actionDef.label}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isClosing && (
                    <div className="mt-4 p-4 bg-neutral-50 rounded-lg border space-y-3">
                      <h3 className="font-semibold text-sm">Close rental {rental.reference}</h3>
                      <Select value={closeOutcome} onValueChange={setCloseOutcome}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clean">Clean (no issues)</SelectItem>
                          <SelectItem value="penalty">Penalty (minor damage)</SelectItem>
                          <SelectItem value="major_damage">Major damage</SelectItem>
                          <SelectItem value="loss">Loss</SelectItem>
                        </SelectContent>
                      </Select>
                      {closeOutcome === "penalty" && (
                        <Input
                          type="number"
                          min="0"
                          placeholder="Penalty amount (SAR)"
                          value={penaltySar}
                          onChange={(e) => setPenaltySar(e.target.value)}
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={loading === rental.id}
                          onClick={() => handleClose(rental.id)}
                          className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        >
                          {loading === rental.id ? "Closing..." : "Confirm close"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setClosingId(null)}>
                          Cancel
                        </Button>
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
