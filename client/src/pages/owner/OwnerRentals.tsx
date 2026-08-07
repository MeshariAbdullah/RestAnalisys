import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, formatSar } from "@/lib/api";
import { getRentalStatusColor, humanizeStatus, formatDate } from "@/lib/utils";

export default function OwnerRentals() {
  const { data: rentals, isLoading } = useQuery({
    queryKey: ["owner-rentals"],
    queryFn: () => rentalsApi.ownerRentals(),
  });

  const activeCount = rentals?.filter((r) =>
    ["active", "out_for_delivery", "confirmed"].includes(r.status)
  ).length ?? 0;

  const totalEarned = rentals?.reduce(
    (sum, r) => sum + (["closed", "closed_with_penalty"].includes(r.status) ? r.rentalSubtotalHalalas : 0),
    0
  ) ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Asset Rentals</h1>
      <p className="text-neutral-500 mb-6">
        Rental activity on your assets.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Active rentals</p>
              <p className="text-xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Gross rental revenue</p>
              <p className="text-xl font-bold">{formatSar(totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading rentals…</p>
      ) : !rentals || rentals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            <Package className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p>No rentals on your assets yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">
                      {(r as any).assetBrand} — {(r as any).assetTitle}
                    </p>
                    <p className="text-xs text-neutral-400 font-mono">{r.reference}</p>
                  </div>
                  <Badge className={`${getRentalStatusColor(r.status)} border-0`}>
                    {humanizeStatus(r.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-6 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {r.startDate} → {r.endDate}
                  </span>
                  <span>{r.durationDays} days</span>
                  <span className="ml-auto font-medium text-neutral-700">
                    {formatSar(r.rentalSubtotalHalalas)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
