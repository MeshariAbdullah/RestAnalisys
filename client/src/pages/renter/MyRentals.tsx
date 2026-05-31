import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, XCircle, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-600 text-white", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending_risk_review;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const CANCELLABLE = ["pending_risk_review", "pending_legal_signing", "pending_payment"];

export default function MyRentals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  async function handleCancel(id: number) {
    const reason = prompt("Reason for cancellation?");
    if (!reason) return;
    setCancelling(id);
    try {
      await rentalsApi.cancel(id, reason);
      await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
      toast({ title: "Rental cancelled", variant: "default" });
    } catch (err) {
      toast({ title: "Cancel failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  }

  const rentals = data ?? [];
  const activeRentals = rentals.filter((r) =>
    !["closed", "closed_with_penalty", "cancelled"].includes(r.status)
  );
  const pastRentals = rentals.filter((r) =>
    ["closed", "closed_with_penalty", "cancelled"].includes(r.status)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't rented anything yet.</p>
            <a href="/browse" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
              Browse the collection
            </a>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Active ({activeRentals.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastRentals.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({rentals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <RentalList rentals={activeRentals} cancelling={cancelling} onCancel={handleCancel} />
          </TabsContent>
          <TabsContent value="past">
            <RentalList rentals={pastRentals} cancelling={cancelling} onCancel={handleCancel} />
          </TabsContent>
          <TabsContent value="all">
            <RentalList rentals={rentals} cancelling={cancelling} onCancel={handleCancel} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function RentalList({
  rentals,
  cancelling,
  onCancel,
}: {
  rentals: Rental[];
  cancelling: number | null;
  onCancel: (id: number) => void;
}) {
  if (rentals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-neutral-500">
          No rentals in this category.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rentals.map((r) => (
        <Card key={r.id} className={r.status === "cancelled" ? "opacity-60" : ""}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                <p className="font-semibold mt-1">
                  {r.startDate} &rarr; {r.endDate}{" "}
                  <span className="text-neutral-500 font-normal">
                    ({r.durationDays} days)
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <StatusBadge status={r.status} />
                  {r.deliveredAt && (
                    <span className="text-xs text-neutral-500">
                      Delivered {new Date(r.deliveredAt).toLocaleDateString()}
                    </span>
                  )}
                  {r.closedAt && (
                    <span className="text-xs text-neutral-500">
                      Closed {new Date(r.closedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Total</p>
                  <p className="font-bold text-lg">{formatSar(r.totalPayableHalalas)}</p>
                  <p className="text-[11px] text-neutral-500">
                    Commitment {formatSar(r.legalCommitmentHalalas)} ({r.legalCommitmentPct}%)
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  {CANCELLABLE.includes(r.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancel(r.id)}
                      disabled={cancelling === r.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      {cancelling === r.id ? "Cancelling..." : "Cancel"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
