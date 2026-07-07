import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
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

const CLOSE_OUTCOMES = ["clean", "penalty", "major_damage", "loss"] as const;
type CloseOutcome = (typeof CLOSE_OUTCOMES)[number];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-700";
    case "out_for_delivery":
      return "bg-amber-100 text-amber-700";
    case "active":
      return "bg-green-100 text-green-700";
    case "return_in_transit":
      return "bg-purple-100 text-purple-700";
    case "under_inspection":
      return "bg-orange-100 text-orange-700";
    case "closed":
      return "bg-neutral-100 text-neutral-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export default function RentalManagement() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<CloseOutcome>("clean");
  const [penaltyAmount, setPenaltyAmount] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rentals"],
    queryFn: () => rentalsApi.list(),
  });

  async function handleAction(
    id: number,
    action: () => Promise<unknown>
  ) {
    setActionError(null);
    setLoadingId(id);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["rentals"] });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Action failed";
      setActionError(`Rental #${id}: ${message}`);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleClose(id: number) {
    const penalty =
      closeOutcome !== "clean" && penaltyAmount
        ? Math.round(parseFloat(penaltyAmount) * 100)
        : undefined;
    await handleAction(id, () =>
      rentalsApi.close(id, closeOutcome, penalty)
    );
    setClosingId(null);
    setCloseOutcome("clean");
    setPenaltyAmount("");
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
      <p className="text-neutral-500 mb-8">
        Manage rental lifecycles — fulfill, deliver, return, and close.
      </p>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No rentals found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: Rental) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500">
                      {r.reference} · Asset #{r.assetId} · Renter #
                      {r.renterId}
                    </p>
                    <p className="font-semibold">
                      {r.startDate} — {r.endDate}{" "}
                      <span className="font-normal text-neutral-500">
                        ({r.durationDays}d)
                      </span>
                    </p>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      Total: {formatSar(r.totalPayableHalalas)}
                    </p>
                  </div>
                  <Badge className={statusBadgeClass(r.status)}>
                    {r.status.replace(/_/g, " ")}
                  </Badge>

                  {/* Action buttons based on status */}
                  {r.status === "confirmed" && (
                    <Button
                      size="sm"
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={loadingId === r.id}
                      onClick={() =>
                        handleAction(r.id, () => rentalsApi.fulfill(r.id))
                      }
                    >
                      {loadingId === r.id ? "..." : "Fulfill"}
                    </Button>
                  )}

                  {r.status === "out_for_delivery" && (
                    <Button
                      size="sm"
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={loadingId === r.id}
                      onClick={() =>
                        handleAction(r.id, () =>
                          rentalsApi.delivered(r.id)
                        )
                      }
                    >
                      {loadingId === r.id ? "..." : "Mark Delivered"}
                    </Button>
                  )}

                  {r.status === "return_in_transit" && (
                    <Button
                      size="sm"
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={loadingId === r.id}
                      onClick={() =>
                        handleAction(r.id, () =>
                          rentalsApi.returned(r.id)
                        )
                      }
                    >
                      {loadingId === r.id ? "..." : "Mark Returned"}
                    </Button>
                  )}

                  {r.status === "under_inspection" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setClosingId(closingId === r.id ? null : r.id)
                      }
                    >
                      Close
                    </Button>
                  )}
                </div>

                {/* Close rental panel */}
                {closingId === r.id && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                    <Select
                      value={closeOutcome}
                      onValueChange={(v) =>
                        setCloseOutcome(v as CloseOutcome)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLOSE_OUTCOMES.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {closeOutcome !== "clean" && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Penalty (SAR)"
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(e.target.value)}
                      />
                    )}
                    <Button
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={loadingId === r.id}
                      onClick={() => handleClose(r.id)}
                    >
                      {loadingId === r.id ? "..." : "Confirm Close"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
