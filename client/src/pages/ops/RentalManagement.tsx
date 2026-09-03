import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-amber-100 text-amber-800",
  pending_legal_signing: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-amber-100 text-amber-800",
  under_inspection: "bg-amber-100 text-amber-800",
  closed: "bg-neutral-200 text-neutral-600",
  closed_with_penalty: "bg-red-100 text-red-700",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-500",
};

const LIFECYCLE_ACTIONS: Record<string, { label: string; action: string; icon: typeof Truck }> = {
  confirmed: { label: "Fulfill (Schedule Delivery)", action: "fulfill", icon: Truck },
  out_for_delivery: { label: "Mark Delivered", action: "delivered", icon: CheckCircle },
  active: { label: "Mark Returned", action: "returned", icon: Package },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Rentals" },
  { value: "confirmed", label: "Awaiting Fulfillment" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "active", label: "Active" },
  { value: "under_inspection", label: "Under Inspection" },
  { value: "in_dispute", label: "In Dispute" },
  { value: "closed", label: "Closed" },
];

export default function RentalManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [closeOutcome, setCloseOutcome] = useState("clean");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const lifecycleMut = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      if (action === "fulfill") return rentalsApi.fulfill(id);
      if (action === "delivered") return rentalsApi.delivered(id);
      if (action === "returned") return rentalsApi.returned(id);
      throw new Error("Unknown action");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const closeMut = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      rentalsApi.close(
        id,
        closeOutcome as "clean" | "penalty" | "major_damage" | "loss",
        closeOutcome === "penalty" ? Number(penaltyAmount) * 100 : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      setExpandedId(null);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const filtered = data
    ? statusFilter === "all"
      ? data
      : data.filter((r: Rental) => r.status === statusFilter)
    : [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
      <p className="text-neutral-500 mb-6">
        Manage the full rental lifecycle: fulfillment, delivery, returns, and closure.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Label className="text-sm text-neutral-500">Filter by status:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-neutral-400">{filtered.length} rental(s)</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-neutral-100 animate-pulse" />
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
            const lifecycleAction = LIFECYCLE_ACTIONS[r.status];
            const isExpanded = expandedId === r.id;

            return (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                        <Badge className={`${STATUS_COLORS[r.status] ?? "bg-neutral-200 text-neutral-600"} hover:opacity-100 border-0`}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1.5">
                        {r.startDate} <ArrowRight className="w-3 h-3 inline mx-1" /> {r.endDate}
                        <span className="text-neutral-400 ml-2">({r.durationDays}d)</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">{formatSar(r.totalPayableHalalas)}</p>
                      <p className="text-xs text-neutral-500">
                        Commitment: {formatSar(r.legalCommitmentHalalas)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {lifecycleAction && (
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-neutral-950"
                          onClick={() =>
                            lifecycleMut.mutate({ id: r.id, action: lifecycleAction.action })
                          }
                          disabled={lifecycleMut.isPending}
                        >
                          {React.createElement(lifecycleAction.icon, { className: "w-4 h-4 mr-1" })}
                          {lifecycleAction.label}
                        </Button>
                      )}
                      {r.status === "under_inspection" && (
                        <Button
                          size="sm"
                          variant={isExpanded ? "secondary" : "outline"}
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        >
                          <ClipboardCheck className="w-4 h-4 mr-1" />
                          Close Rental
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && r.status === "under_inspection" && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Outcome</Label>
                          <Select value={closeOutcome} onValueChange={setCloseOutcome}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clean">Clean Return</SelectItem>
                              <SelectItem value="penalty">Minor Damage (Penalty)</SelectItem>
                              <SelectItem value="major_damage">Major Damage</SelectItem>
                              <SelectItem value="loss">Loss</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {closeOutcome === "penalty" && (
                          <div>
                            <Label>Penalty Amount (SAR)</Label>
                            <Input
                              type="number"
                              value={penaltyAmount}
                              onChange={(e) => setPenaltyAmount(e.target.value)}
                              placeholder="e.g. 500"
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => closeMut.mutate({ id: r.id })}
                          disabled={closeMut.isPending}
                          className="bg-amber-500 hover:bg-amber-600 text-neutral-950"
                        >
                          {closeMut.isPending ? "Closing..." : "Close Rental"}
                        </Button>
                        <Button variant="outline" onClick={() => setExpandedId(null)}>
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
