import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-amber-100 text-amber-800",
  under_inspection: "bg-purple-100 text-purple-700",
  closed: "bg-neutral-200 text-neutral-600",
  closed_with_penalty: "bg-red-100 text-red-700",
};

const ACTIONS: Record<string, { label: string; icon: typeof Package; action: string; nextStatus: string }> = {
  confirmed: { label: "Start fulfillment", icon: Package, action: "fulfill", nextStatus: "out_for_delivery" },
  out_for_delivery: { label: "Mark delivered", icon: Truck, action: "delivered", nextStatus: "active" },
  active: { label: "Mark returned", icon: RotateCcw, action: "returned", nextStatus: "under_inspection" },
};

export default function RentalManagement() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const actionable = (data ?? []).filter(
    (r: Rental) => !["cancelled", "closed", "closed_with_penalty", "in_dispute", "enforcement"].includes(r.status)
  );

  async function handleAction(rental: Rental) {
    const config = ACTIONS[rental.status];
    if (!config) return;

    setProcessing(rental.id);
    setError(null);
    try {
      if (config.action === "fulfill") await rentalsApi.fulfill(rental.id);
      else if (config.action === "delivered") await rentalsApi.delivered(rental.id);
      else if (config.action === "returned") await rentalsApi.returned(rental.id);
      await qc.invalidateQueries({ queryKey: ["rentals-all"] });
    } catch (err) {
      setError(`Rental #${rental.id}: ${(err as Error).message}`);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental management</h1>
      <p className="text-neutral-500 mb-8">
        Progress active rentals through fulfillment, delivery, and return.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : actionable.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No active rentals to manage.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actionable.map((rental: Rental) => {
            const action = ACTIONS[rental.status];
            const ActionIcon = action?.icon ?? ArrowRight;
            return (
              <Card key={rental.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500">
                        {rental.reference} · Asset #{rental.assetId}
                      </p>
                      <p className="font-semibold">
                        {rental.startDate} → {rental.endDate}
                        <span className="text-neutral-500 font-normal ml-2">
                          ({rental.durationDays} days)
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Total: {formatSar(rental.totalPayableHalalas)}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[rental.status] ?? "bg-neutral-200 text-neutral-600"}>
                      {rental.status.replace(/_/g, " ")}
                    </Badge>
                    {action && (
                      <Button
                        onClick={() => handleAction(rental)}
                        disabled={processing === rental.id}
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        size="sm"
                      >
                        <ActionIcon className="w-4 h-4 mr-1" />
                        {processing === rental.id ? "..." : action.label}
                      </Button>
                    )}
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
