import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminRentalsApi, rentalsApi, formatSar, type Rental } from "@/lib/api";

const PAGE_SIZE = 25;

const STATUSES = [
  "all",
  "pending_risk_review",
  "pending_legal_signing",
  "pending_payment",
  "confirmed",
  "out_for_delivery",
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
  "closed_with_penalty",
  "in_dispute",
  "enforcement",
  "cancelled",
];

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-amber-100 text-amber-800",
  pending_legal_signing: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-blue-100 text-blue-700",
  under_inspection: "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-700",
  closed_with_penalty: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-200 text-neutral-600",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-700",
};

export default function RentalManagement() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rentals", statusFilter, page],
    queryFn: () =>
      adminRentalsApi.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const rows = data?.rentals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function performAction(rental: Rental, action: string) {
    setActionLoading(rental.id);
    try {
      switch (action) {
        case "fulfill":
          await rentalsApi.fulfill(rental.id);
          break;
        case "delivered":
          await rentalsApi.delivered(rental.id);
          break;
        case "returned":
          await rentalsApi.returned(rental.id);
          break;
        case "close_clean":
          await rentalsApi.close(rental.id, "clean");
          break;
      }
      qc.invalidateQueries({ queryKey: ["admin-rentals"] });
    } catch {
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rental management</h1>
      <p className="text-neutral-500 mb-6">
        Manage all platform rentals ({total} total)
      </p>

      <div className="flex gap-3 mb-6">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No rentals found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-mono text-xs text-neutral-500">
                          {r.reference}
                        </p>
                        <Badge
                          className={
                            STATUS_COLORS[r.status] ??
                            "bg-neutral-200 text-neutral-700"
                          }
                        >
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        {r.startDate} - {r.endDate} ({r.durationDays} days)
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Renter #{r.renterId} | Owner #{r.ownerId} | Asset #{r.assetId}
                      </p>
                    </div>

                    <div className="text-right mr-4">
                      <p className="font-bold">{formatSar(r.totalPayableHalalas)}</p>
                      <p className="text-xs text-neutral-500">
                        Commitment {r.legalCommitmentPct}%
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {r.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === r.id}
                          onClick={() => performAction(r, "fulfill")}
                        >
                          <Truck className="w-4 h-4 mr-1" /> Fulfill
                        </Button>
                      )}
                      {r.status === "out_for_delivery" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === r.id}
                          onClick={() => performAction(r, "delivered")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Delivered
                        </Button>
                      )}
                      {(r.status === "active" ||
                        r.status === "return_in_transit") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === r.id}
                          onClick={() => performAction(r, "returned")}
                        >
                          <Package className="w-4 h-4 mr-1" /> Returned
                        </Button>
                      )}
                      {r.status === "under_inspection" && (
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
                          disabled={actionLoading === r.id}
                          onClick={() => performAction(r, "close_clean")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Close clean
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-neutral-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
