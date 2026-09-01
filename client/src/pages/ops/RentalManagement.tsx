import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Calendar, User, Package } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

// ── Status helpers ──────────────────────────────────────────────────────────

type RentalStatus = typeof STATUS_TABS[number]["value"];

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "returned_under_inspection", label: "Returned" },
  { value: "in_dispute", label: "In Dispute" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "active":
    case "out_for_delivery":
    case "delivered":
      return "bg-blue-100 text-blue-700";
    case "confirmed":
      return "bg-amber-100 text-amber-800";
    case "returned_under_inspection":
      return "bg-amber-100 text-amber-800";
    case "in_dispute":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-neutral-200 text-neutral-600";
    default:
      return "bg-neutral-200 text-neutral-700";
  }
}

type CloseOutcome = "clean" | "penalty" | "major_damage" | "loss";

const OUTCOME_OPTIONS: { value: CloseOutcome; label: string }[] = [
  { value: "clean", label: "Clean return" },
  { value: "penalty", label: "Penalty" },
  { value: "major_damage", label: "Major damage" },
  { value: "loss", label: "Loss" },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function RentalManagement() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("all");
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // Close-modal state
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState<CloseOutcome>("clean");
  const [closePenaltyHalalas, setClosePenaltyHalalas] = useState<string>("");

  const { data: rentals, isLoading } = useQuery({
    queryKey: ["rentals"],
    queryFn: () => rentalsApi.list(),
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  async function runAction(id: number, action: () => Promise<unknown>) {
    setActionError((prev) => ({ ...prev, [id]: "" }));
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["rentals"] });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setActionError((prev) => ({ ...prev, [id]: msg }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
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
    const penalty =
      closePenaltyHalalas.trim() !== ""
        ? Math.round(Number(closePenaltyHalalas) * 100)
        : undefined;
    runAction(id, () => rentalsApi.close(id, closeOutcome, penalty)).then(
      () => {
        setClosingId(null);
        setCloseOutcome("clean");
        setClosePenaltyHalalas("");
      }
    );
  }

  // ── Filtering ───────────────────────────────────────────────────────────

  const filtered =
    rentals && tab !== "all"
      ? rentals.filter((r) => r.status === tab)
      : rentals ?? [];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
      <p className="text-neutral-500 mb-8">
        Track and manage the full rental lifecycle — from fulfillment through
        to close.
      </p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {rentals && t.value !== "all" && (
                <span className="ml-1.5 text-[11px] opacity-60">
                  {rentals.filter((r) => r.status === t.value).length}
                </span>
              )}
              {rentals && t.value === "all" && (
                <span className="ml-1.5 text-[11px] opacity-60">
                  {rentals.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All tabs share the same content area */}
        {STATUS_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {isLoading ? (
              <p className="text-neutral-500">Loading...</p>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-neutral-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  {tab === "all"
                    ? "No rentals found."
                    : `No ${t.label.toLowerCase()} rentals.`}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((rental) => (
                  <RentalCard
                    key={rental.id}
                    rental={rental}
                    error={actionError[rental.id]}
                    loading={actionLoading[rental.id]}
                    closingId={closingId}
                    closeOutcome={closeOutcome}
                    closePenaltyHalalas={closePenaltyHalalas}
                    onFulfill={handleFulfill}
                    onDelivered={handleDelivered}
                    onReturned={handleReturned}
                    onOpenClose={(id) => {
                      setClosingId(closingId === id ? null : id);
                      setCloseOutcome("clean");
                      setClosePenaltyHalalas("");
                    }}
                    onCloseOutcomeChange={setCloseOutcome}
                    onClosePenaltyChange={setClosePenaltyHalalas}
                    onClose={handleClose}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ── Rental Card ─────────────────────────────────────────────────────────────

interface RentalCardProps {
  rental: Rental;
  error?: string;
  loading?: boolean;
  closingId: number | null;
  closeOutcome: CloseOutcome;
  closePenaltyHalalas: string;
  onFulfill: (id: number) => void;
  onDelivered: (id: number) => void;
  onReturned: (id: number) => void;
  onOpenClose: (id: number) => void;
  onCloseOutcomeChange: (v: CloseOutcome) => void;
  onClosePenaltyChange: (v: string) => void;
  onClose: (id: number) => void;
}

function RentalCard({
  rental,
  error,
  loading,
  closingId,
  closeOutcome,
  closePenaltyHalalas,
  onFulfill,
  onDelivered,
  onReturned,
  onOpenClose,
  onCloseOutcomeChange,
  onClosePenaltyChange,
  onClose,
}: RentalCardProps) {
  const r = rental;
  const isClosing = closingId === r.id;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500">
              {r.reference} · Rental #{r.id} · Asset #{r.assetId}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="font-semibold">{formatSar(r.totalPayableHalalas)}</span>
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {r.durationDays} day{r.durationDays !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                Renter #{r.renterId}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {new Date(r.startDate).toLocaleDateString()} &ndash;{" "}
              {new Date(r.endDate).toLocaleDateString()}
            </p>
          </div>

          <Badge className={`border-0 ${statusBadgeClass(r.status)}`}>
            {r.status.replace(/_/g, " ")}
          </Badge>

          {/* Action buttons */}
          {r.status === "confirmed" && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onFulfill(r.id)}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {loading ? "..." : "Fulfill"}
            </Button>
          )}
          {r.status === "out_for_delivery" && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onDelivered(r.id)}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {loading ? "..." : "Mark Delivered"}
            </Button>
          )}
          {r.status === "active" && (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => onReturned(r.id)}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {loading ? "..." : "Mark Returned"}
            </Button>
          )}
          {r.status === "returned_under_inspection" && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onOpenClose(r.id)}
            >
              Close
            </Button>
          )}
        </div>

        {/* Error display */}
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Close panel */}
        {isClosing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t">
            <Select
              value={closeOutcome}
              onValueChange={(v) => onCloseOutcomeChange(v as CloseOutcome)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Penalty amount in SAR (optional)"
              value={closePenaltyHalalas}
              onChange={(e) => onClosePenaltyChange(e.target.value)}
              className="min-h-[40px] h-10"
              rows={1}
            />

            <Button
              disabled={loading}
              onClick={() => onClose(r.id)}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {loading ? "Closing..." : "Confirm Close"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
