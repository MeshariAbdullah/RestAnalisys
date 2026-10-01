import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Truck,
  ClipboardCheck,
  XCircle,
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

/* ── status display metadata ────────────────────────────── */

const STATUS_META: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Truck },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: RotateCcw },
  inspection_post_return: { color: "bg-amber-100 text-amber-800", icon: ClipboardCheck },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

const TERMINAL_STATUSES = new Set([
  "cancelled",
  "closed_clean",
  "closed_with_penalty",
]);

const CLOSE_OUTCOMES = [
  { value: "clean", label: "Clean" },
  { value: "penalty", label: "Penalty" },
  { value: "major_damage", label: "Major damage" },
  { value: "loss", label: "Loss" },
] as const;

type CloseOutcome = "clean" | "penalty" | "major_damage" | "loss";

/* ── StatusBadge ────────────────────────────────────────── */

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

/* ── main page component ────────────────────────────────── */

export default function RentalLifecycle() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close-flow state
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<CloseOutcome>("clean");
  const [penaltyAmount, setPenaltyAmount] = useState("");

  const activeRentals = (data ?? []).filter(
    (r) => !TERMINAL_STATUSES.has(r.status)
  );

  /* ── action handlers ────────────────────────────────── */

  async function runAction(id: number, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["rentals-all"] });
      await qc.invalidateQueries({ queryKey: ["ops-summary"] });
    } catch (err) {
      setError((err as Error).message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function handleFulfill(id: number) {
    runAction(id, () => rentalsApi.fulfill(id));
  }

  function handleDelivered(id: number) {
    runAction(id, () => rentalsApi.delivered(id));
  }

  function handleReturned(id: number) {
    runAction(id, () => rentalsApi.returned(id));
  }

  function handleClose(id: number) {
    const halalas =
      penaltyAmount.trim() !== "" ? Math.round(Number(penaltyAmount) * 100) : undefined;
    runAction(id, () => rentalsApi.close(id, closeOutcome, halalas)).then(() => {
      setClosingId(null);
      setCloseOutcome("clean");
      setPenaltyAmount("");
    });
  }

  /* ── render ─────────────────────────────────────────── */

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental lifecycle</h1>
      <p className="text-neutral-500 mb-8">
        Progress rentals through fulfillment, delivery, return and closure.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-800"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : activeRentals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No active rentals require action.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeRentals.map((r: Rental) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-neutral-500">
                      {r.reference}
                    </p>
                    <p className="font-semibold mt-1">
                      {r.startDate} &rarr; {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">
                        ({r.durationDays} days)
                      </span>
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-neutral-500 uppercase">Total</p>
                    <p className="font-bold text-lg">
                      {formatSar(r.totalPayableHalalas)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-start gap-2">
                    {r.status === "confirmed" && (
                      <Button
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => handleFulfill(r.id)}
                      >
                        {busyId === r.id ? "..." : "Fulfill"}
                      </Button>
                    )}

                    {r.status === "in_fulfillment" && (
                      <Button
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => handleDelivered(r.id)}
                      >
                        {busyId === r.id ? "..." : "Mark Delivered"}
                      </Button>
                    )}

                    {(r.status === "awaiting_return" ||
                      r.status === "returned") && (
                      <Button
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => handleReturned(r.id)}
                      >
                        {busyId === r.id ? "..." : "Mark Returned"}
                      </Button>
                    )}

                    {r.status === "inspection_post_return" && (
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
                </div>

                {/* Close panel */}
                {closingId === r.id && r.status === "inspection_post_return" && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">
                        Outcome
                      </label>
                      <Select
                        value={closeOutcome}
                        onValueChange={(v) => setCloseOutcome(v as CloseOutcome)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLOSE_OUTCOMES.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">
                        Penalty (SAR, optional)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(e.target.value)}
                      />
                    </div>

                    <Button
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={busyId === r.id}
                      onClick={() => handleClose(r.id)}
                    >
                      {busyId === r.id ? "..." : "Confirm Close"}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setClosingId(null);
                        setCloseOutcome("clean");
                        setPenaltyAmount("");
                      }}
                    >
                      Cancel
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
