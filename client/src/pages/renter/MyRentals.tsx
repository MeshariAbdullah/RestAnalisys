import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSignature,
  Gavel,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending_risk_review: {
    color: "bg-neutral-200 text-neutral-700",
    icon: Clock,
    label: "Reviewing",
  },
  pending_legal_signing: {
    color: "bg-amber-100 text-amber-800",
    icon: FileSignature,
    label: "Sign contract",
  },
  pending_payment: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
    label: "Payment due",
  },
  confirmed: {
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
    label: "Confirmed",
  },
  out_for_delivery: {
    color: "bg-blue-100 text-blue-700",
    icon: Package,
    label: "Out for delivery",
  },
  active: {
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    label: "In use",
  },
  return_in_transit: {
    color: "bg-amber-100 text-amber-800",
    icon: Package,
    label: "Return in transit",
  },
  under_inspection: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
    label: "Inspecting return",
  },
  closed: {
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    label: "Closed",
  },
  closed_with_penalty: {
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
    label: "Closed · penalty",
  },
  in_dispute: {
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
    label: "Disputed",
  },
  enforcement: {
    color: "bg-red-100 text-red-800",
    icon: Gavel,
    label: "Under enforcement",
  },
  cancelled: {
    color: "bg-neutral-200 text-neutral-600",
    icon: AlertCircle,
    label: "Cancelled",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta =
    STATUS_META[status] ?? {
      color: "bg-neutral-200 text-neutral-700",
      icon: Clock,
      label: status.replace(/_/g, " "),
    };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {meta.label}
    </Badge>
  );
}

export default function MyRentals() {
  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't rented anything yet.</p>
            <a
              href="/browse"
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Browse the collection →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((r: Rental) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-neutral-500">
                      {r.reference}
                    </p>
                    <p className="font-semibold mt-1">
                      {r.startDate} → {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">
                        ({r.durationDays} days)
                      </span>
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase">Total paid</p>
                    <p className="font-bold text-lg">
                      {formatSar(r.totalPayableHalalas)}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Commitment {formatSar(r.legalCommitmentHalalas)} (
                      {r.legalCommitmentPct}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
