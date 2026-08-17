import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Truck,
  Clock,
  AlertCircle,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const ACTIONABLE_STATUSES = ["confirmed", "out_for_delivery", "active", "return_in_transit", "under_inspection"];

const STATUS_META: Record<string, { color: string; label: string }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", label: "Risk review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", label: "Awaiting signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", label: "Awaiting payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", label: "Out for delivery" },
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", label: "Return in transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", label: "Under inspection" },
  closed: { color: "bg-green-100 text-green-700", label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", label: "Closed (penalty)" },
  in_dispute: { color: "bg-red-100 text-red-700", label: "In dispute" },
  enforcement: { color: "bg-red-200 text-red-800", label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", label: "Cancelled" },
};

export default function RentalManagement() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-rentals"],
    queryFn: () => rentalsApi.list(),
  });

  const rentals = (data ?? []).filter((r: Rental) =>
    filter
      ? `${r.reference} ${r.status}`.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  async function performAction(rentalId: number, action: string) {
    setActionLoading(rentalId);
    setActionError(null);
    try {
      switch (action) {
        case "fulfill":
          await rentalsApi.fulfill(rentalId);
          break;
        case "delivered":
          await rentalsApi.delivered(rentalId);
          break;
        case "returned":
          await rentalsApi.returned(rentalId);
          break;
        case "close_clean":
          await rentalsApi.close(rentalId, "clean");
          break;
      }
      await qc.invalidateQueries({ queryKey: ["all-rentals"] });
    } catch (err) {
      setActionError(`#${rentalId}: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  }

  function getActions(r: Rental): Array<{ label: string; action: string; variant: "default" | "outline" }> {
    switch (r.status) {
      case "confirmed":
        return [{ label: "Fulfill", action: "fulfill", variant: "default" }];
      case "out_for_delivery":
        return [{ label: "Mark delivered", action: "delivered", variant: "default" }];
      case "active":
        return [{ label: "Mark returned", action: "returned", variant: "outline" }];
      case "return_in_transit":
        return [{ label: "Mark returned", action: "returned", variant: "default" }];
      case "under_inspection":
        return [{ label: "Close (clean)", action: "close_clean", variant: "default" }];
      default:
        return [];
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental management</h1>
      <p className="text-neutral-500 mb-6">
        Manage rental lifecycle: fulfill, deliver, return, close.
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="Filter by reference or status..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {actionError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : rentals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No rentals found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((r: Rental) => {
            const meta = STATUS_META[r.status] ?? { color: "bg-neutral-200", label: r.status };
            const actions = getActions(r);
            return (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                      <p className="font-semibold mt-0.5">
                        Asset #{r.assetId} &middot; {r.startDate} &rarr; {r.endDate}
                        <span className="text-neutral-500 font-normal ml-1">
                          ({r.durationDays}d)
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Renter #{r.renterId} &middot; Owner #{r.ownerId} &middot;{" "}
                        {formatSar(r.totalPayableHalalas)}
                      </p>
                    </div>
                    <Badge className={`border-0 ${meta.color}`}>{meta.label}</Badge>
                    {actions.map((a) => (
                      <Button
                        key={a.action}
                        variant={a.variant}
                        size="sm"
                        disabled={actionLoading === r.id}
                        onClick={() => performAction(r.id, a.action)}
                        className={
                          a.variant === "default"
                            ? "bg-amber-500 text-neutral-950 hover:bg-amber-400"
                            : ""
                        }
                      >
                        {actionLoading === r.id ? "..." : a.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
