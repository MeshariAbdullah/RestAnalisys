import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, CheckCircle, Package, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, type OwnerRental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  pending_risk_review: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
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
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

export default function OwnerRentals() {
  const { data, isLoading } = useQuery({
    queryKey: ["owner-rentals"],
    queryFn: () => assetsApi.ownerRentals(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Asset Rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track all rentals of your listed assets.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No rentals for your assets yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: OwnerRental) => {
            const meta = STATUS_META[r.status] ?? {
              color: "bg-neutral-200 text-neutral-700",
              icon: Clock,
            };
            const Icon = meta.icon;
            return (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500">
                        Rental #{r.id} · {r.reference}
                      </p>
                      <p className="font-semibold">
                        {r.assetBrand} — {r.assetTitle}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                        <span>{r.startDate} → {r.endDate}</span>
                        <span>{r.durationDays} days</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={`border-0 ${meta.color}`}>
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                      <p className="text-sm font-semibold mt-1">
                        {formatSar(r.rentalSubtotalHalalas)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Fee: {formatSar(r.platformFeeHalalas)}
                      </p>
                    </div>
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
