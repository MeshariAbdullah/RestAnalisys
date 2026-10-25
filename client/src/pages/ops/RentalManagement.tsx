import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { PackageCheck, Truck, RotateCcw, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-yellow-100 text-yellow-800",
  pending_legal_signing: "bg-orange-100 text-orange-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  active: "bg-green-100 text-green-800",
  return_in_transit: "bg-purple-100 text-purple-800",
  under_inspection: "bg-pink-100 text-pink-800",
  closed: "bg-neutral-100 text-neutral-600",
  closed_with_penalty: "bg-red-100 text-red-700",
  in_dispute: "bg-red-100 text-red-800",
  enforcement: "bg-red-200 text-red-900",
  cancelled: "bg-neutral-100 text-neutral-500",
};

type CloseOutcome = "clean" | "penalty" | "major_damage" | "loss";

export default function RentalManagement() {
  const queryClient = useQueryClient();
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<CloseOutcome>("clean");
  const [penaltyInput, setPenaltyInput] = useState("");

  const { data: rentals, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
    setClosingId(null);
    setCloseOutcome("clean");
    setPenaltyInput("");
  };

  const fulfillMut = useMutation({
    mutationFn: (id: number) => rentalsApi.fulfill(id),
    onSuccess,
  });

  const deliveredMut = useMutation({
    mutationFn: (id: number) => rentalsApi.delivered(id),
    onSuccess,
  });

  const returnedMut = useMutation({
    mutationFn: (id: number) => rentalsApi.returned(id),
    onSuccess,
  });

  const closeMut = useMutation({
    mutationFn: ({
      id,
      outcome,
      penaltyHalalas,
    }: {
      id: number;
      outcome: CloseOutcome;
      penaltyHalalas?: number;
    }) => rentalsApi.close(id, outcome, penaltyHalalas),
    onSuccess,
  });

  const isBusy =
    fulfillMut.isPending ||
    deliveredMut.isPending ||
    returnedMut.isPending ||
    closeMut.isPending;

  function confirmAction(label: string, fn: () => void) {
    if (window.confirm(`Are you sure you want to ${label}?`)) fn();
  }

  function handleClose(id: number) {
    const penaltyHalalas =
      closeOutcome === "penalty" && penaltyInput
        ? Math.round(Number(penaltyInput) * 100)
        : undefined;
    confirmAction(`close this rental as "${closeOutcome}"`, () =>
      closeMut.mutate({ id, outcome: closeOutcome, penaltyHalalas })
    );
  }

  function renderActions(rental: Rental) {
    const { id, status } = rental;

    if (status === "confirmed") {
      return (
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() =>
            confirmAction("fulfill this rental", () => fulfillMut.mutate(id))
          }
        >
          <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
          {fulfillMut.isPending ? "…" : "Fulfill"}
        </Button>
      );
    }

    if (status === "out_for_delivery") {
      return (
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() =>
            confirmAction("mark this rental as delivered", () =>
              deliveredMut.mutate(id)
            )
          }
        >
          <Truck className="w-3.5 h-3.5 mr-1.5" />
          {deliveredMut.isPending ? "…" : "Mark Delivered"}
        </Button>
      );
    }

    if (status === "active" || status === "return_in_transit") {
      return (
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() =>
            confirmAction("mark this rental as returned", () =>
              returnedMut.mutate(id)
            )
          }
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          {returnedMut.isPending ? "…" : "Mark Returned"}
        </Button>
      );
    }

    if (status === "under_inspection") {
      if (closingId === id) {
        return (
          <div className="flex flex-col gap-2">
            <Select
              value={closeOutcome}
              onValueChange={(v) => setCloseOutcome(v as CloseOutcome)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="major_damage">Major damage</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
              </SelectContent>
            </Select>
            {closeOutcome === "penalty" && (
              <input
                type="number"
                placeholder="Penalty (SAR)"
                value={penaltyInput}
                onChange={(e) => setPenaltyInput(e.target.value)}
                className="h-8 px-2 text-xs border rounded"
                min="0"
                step="0.01"
              />
            )}
            <div className="flex gap-1">
              <Button
                size="sm"
                disabled={isBusy}
                onClick={() => handleClose(id)}
                className="flex-1"
              >
                {closeMut.isPending ? "…" : "Confirm"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClosingId(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        );
      }
      return (
        <Button size="sm" onClick={() => setClosingId(id)}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Close
        </Button>
      );
    }

    return <span className="text-xs text-neutral-400">—</span>;
  }

  const actionable = (rentals ?? []).filter((r) =>
    [
      "confirmed",
      "out_for_delivery",
      "active",
      "return_in_transit",
      "under_inspection",
    ].includes(r.status)
  );
  const other = (rentals ?? []).filter(
    (r) =>
      ![
        "confirmed",
        "out_for_delivery",
        "active",
        "return_in_transit",
        "under_inspection",
      ].includes(r.status)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Lifecycle</h1>
      <p className="text-neutral-500 mb-8">
        Manage rental fulfillment, delivery, returns and closure.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : (rentals ?? []).length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          No rentals found.
        </div>
      ) : (
        <>
          {actionable.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-0">
                <div className="px-6 py-3 border-b bg-neutral-50">
                  <h2 className="text-sm font-semibold text-neutral-700">
                    Actionable ({actionable.length})
                  </h2>
                </div>
                <RentalTable
                  rentals={actionable}
                  renderActions={renderActions}
                />
              </CardContent>
            </Card>
          )}

          {other.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-3 border-b bg-neutral-50">
                  <h2 className="text-sm font-semibold text-neutral-700">
                    Other ({other.length})
                  </h2>
                </div>
                <RentalTable rentals={other} renderActions={renderActions} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RentalTable({
  rentals,
  renderActions,
}: {
  rentals: Rental[];
  renderActions: (r: Rental) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-500 border-b">
            <th className="px-6 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Start</th>
            <th className="px-4 py-3 font-medium">End</th>
            <th className="px-4 py-3 font-medium">Days</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-neutral-50">
              <td className="px-6 py-3 font-mono text-xs">{r.reference}</td>
              <td className="px-4 py-3">
                <Badge
                  className={
                    STATUS_COLORS[r.status] ?? "bg-neutral-100 text-neutral-600"
                  }
                >
                  {r.status.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="px-4 py-3 font-medium">
                {formatSar(r.totalPayableHalalas)}
              </td>
              <td className="px-4 py-3">{r.startDate}</td>
              <td className="px-4 py-3">{r.endDate}</td>
              <td className="px-4 py-3">{r.durationDays}d</td>
              <td className="px-4 py-3">{renderActions(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
