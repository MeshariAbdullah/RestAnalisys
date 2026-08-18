import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  ArrowRight,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_risk_review: { label: "Pending Risk", color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: { label: "Awaiting Signature", color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_payment: { label: "Awaiting Payment", color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-700", icon: Truck },
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { label: "Return in Transit", color: "bg-amber-100 text-amber-700", icon: Truck },
  under_inspection: { label: "Under Inspection", color: "bg-orange-100 text-orange-700", icon: Clock },
  closed: { label: "Closed", color: "bg-neutral-200 text-neutral-600", icon: CheckCircle },
  closed_with_penalty: { label: "Closed (Penalty)", color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { label: "Disputed", color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { label: "Enforcement", color: "bg-red-200 text-red-800", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-neutral-200 text-neutral-500", icon: AlertCircle },
};

const LIFECYCLE_ACTIONS: Record<string, { label: string; next: string; variant?: "default" | "destructive" }[]> = {
  confirmed: [{ label: "Fulfill (Schedule Delivery)", next: "fulfill" }],
  out_for_delivery: [{ label: "Mark Delivered", next: "delivered" }],
  active: [{ label: "Mark Returned", next: "returned" }],
  return_in_transit: [{ label: "Mark Returned", next: "returned" }],
  under_inspection: [
    { label: "Close — Clean", next: "close_clean" },
    { label: "Close — Penalty", next: "close_penalty" },
    { label: "Close — Major Damage", next: "close_damage", variant: "destructive" },
    { label: "Close — Loss", next: "close_loss", variant: "destructive" },
  ],
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_risk_review;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} hover:${cfg.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

export default function RentalManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{
    rental: Rental;
    action: string;
  } | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState("");

  const { data: allRentals, isLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const fulfillMutation = useMutation({
    mutationFn: (id: number) => rentalsApi.fulfill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      toast({ description: "Rental fulfilled — delivery scheduled", variant: "success" });
      setActionDialog(null);
    },
    onError: (e: Error) => toast({ description: e.message, variant: "destructive" }),
  });

  const deliveredMutation = useMutation({
    mutationFn: (id: number) => rentalsApi.delivered(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      toast({ description: "Rental marked as delivered", variant: "success" });
      setActionDialog(null);
    },
    onError: (e: Error) => toast({ description: e.message, variant: "destructive" }),
  });

  const returnedMutation = useMutation({
    mutationFn: (id: number) => rentalsApi.returned(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      toast({ description: "Rental marked as returned — inspection required", variant: "success" });
      setActionDialog(null);
    },
    onError: (e: Error) => toast({ description: e.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: ({
      id,
      outcome,
      penaltyHalalas,
    }: {
      id: number;
      outcome: "clean" | "penalty" | "major_damage" | "loss";
      penaltyHalalas?: number;
    }) => rentalsApi.close(id, outcome, penaltyHalalas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      toast({ description: "Rental closed", variant: "success" });
      setActionDialog(null);
      setPenaltyAmount("");
    },
    onError: (e: Error) => toast({ description: e.message, variant: "destructive" }),
  });

  function executeAction(rental: Rental, action: string) {
    switch (action) {
      case "fulfill":
        fulfillMutation.mutate(rental.id);
        break;
      case "delivered":
        deliveredMutation.mutate(rental.id);
        break;
      case "returned":
        returnedMutation.mutate(rental.id);
        break;
      case "close_clean":
        closeMutation.mutate({ id: rental.id, outcome: "clean" });
        break;
      case "close_penalty":
        closeMutation.mutate({
          id: rental.id,
          outcome: "penalty",
          penaltyHalalas: Math.round(Number(penaltyAmount) * 100),
        });
        break;
      case "close_damage":
        closeMutation.mutate({ id: rental.id, outcome: "major_damage" });
        break;
      case "close_loss":
        closeMutation.mutate({ id: rental.id, outcome: "loss" });
        break;
    }
  }

  const filtered = (allRentals ?? []).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !r.reference.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const actionable = filtered.filter((r) => LIFECYCLE_ACTIONS[r.status]);
  const others = filtered.filter((r) => !LIFECYCLE_ACTIONS[r.status]);

  const isPending =
    fulfillMutation.isPending ||
    deliveredMutation.isPending ||
    returnedMutation.isPending ||
    closeMutation.isPending;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental Management</h1>
      <p className="text-neutral-500 mb-6">
        Manage rental lifecycle — fulfill, deliver, return and close.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search by reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="return_in_transit">Return in Transit</SelectItem>
            <SelectItem value="under_inspection">Under Inspection</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="closed_with_penalty">Closed (Penalty)</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {actionable.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-amber-500" />
                Needs action ({actionable.length})
              </h2>
              <div className="space-y-3">
                {actionable.map((r) => (
                  <RentalCard
                    key={r.id}
                    rental={r}
                    onAction={(action) => setActionDialog({ rental: r, action })}
                  />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Other rentals ({others.length})
              </h2>
              <div className="space-y-3">
                {others.map((r) => (
                  <RentalCard key={r.id} rental={r} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>No rentals match the current filter.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setPenaltyAmount("");
          }
        }}
      >
        {actionDialog && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Confirm action — {actionDialog.rental.reference}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.action === "fulfill" &&
                  "This will change the rental status to 'out for delivery' and create a shipment record."}
                {actionDialog.action === "delivered" &&
                  "This will mark the asset as delivered to the renter and activate the rental."}
                {actionDialog.action === "returned" &&
                  "This will mark the asset as returned and send it for inspection."}
                {actionDialog.action === "close_clean" &&
                  "Close this rental with no issues. The asset will be re-listed."}
                {actionDialog.action === "close_penalty" &&
                  "Close this rental with a penalty charge to the renter."}
                {actionDialog.action === "close_damage" &&
                  "This will trigger Sanad execution for major damage. This is irreversible."}
                {actionDialog.action === "close_loss" &&
                  "This will trigger Sanad execution for loss. This is irreversible."}
              </DialogDescription>
            </DialogHeader>

            {actionDialog.action === "close_penalty" && (
              <div className="space-y-2">
                <Label>Penalty amount (SAR)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setActionDialog(null);
                  setPenaltyAmount("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant={
                  actionDialog.action.includes("damage") || actionDialog.action.includes("loss")
                    ? "destructive"
                    : "default"
                }
                disabled={isPending || (actionDialog.action === "close_penalty" && !penaltyAmount)}
                onClick={() => executeAction(actionDialog.rental, actionDialog.action)}
              >
                {isPending ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function RentalCard({
  rental,
  onAction,
}: {
  rental: Rental;
  onAction?: (action: string) => void;
}) {
  const actions = LIFECYCLE_ACTIONS[rental.status];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-mono text-sm font-medium">{rental.reference}</p>
              <StatusBadge status={rental.status} />
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              {rental.startDate} → {rental.endDate} ({rental.durationDays} days)
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="font-bold">{formatSar(rental.totalPayableHalalas)}</p>
            <p className="text-xs text-neutral-500">
              Commitment: {formatSar(rental.legalCommitmentHalalas)}
            </p>
          </div>
        </div>

        {actions && onAction && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100 flex-wrap">
            {actions.map((a) => (
              <Button
                key={a.next}
                size="sm"
                variant={a.variant ?? "default"}
                onClick={() => onAction(a.next)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
