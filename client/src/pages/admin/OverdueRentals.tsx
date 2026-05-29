import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar, Rental } from "@/lib/api";

function daysOverdue(endDate: string): number {
  const end = new Date(endDate + "T00:00:00Z").getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24)));
}

export default function OverdueRentals() {
  const query = useQuery({
    queryKey: ["overdue-rentals"],
    queryFn: () => adminApi.overdueRentals(),
  });

  const rentals = query.data ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Clock className="w-7 h-7 text-red-500" />
        <h1 className="text-3xl font-bold">Overdue rentals</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Active rentals past their scheduled return date.
      </p>

      {rentals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            {query.isLoading ? "Loading..." : "No overdue rentals — all clear."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rentals.map((r: Rental) => {
            const overdue = daysOverdue(r.endDate);
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center gap-4">
                  <AlertTriangle
                    className={`w-6 h-6 shrink-0 ${
                      overdue > 7 ? "text-red-500" : "text-amber-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{r.reference}</span>
                      <Badge
                        variant={overdue > 7 ? "destructive" : "secondary"}
                      >
                        {overdue} days overdue
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-500">
                      End date: {new Date(r.endDate).toLocaleDateString()} · Asset #{r.assetId} · Renter #{r.renterId}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">{formatSar(r.totalPayableHalalas)}</div>
                    <div className="text-xs text-neutral-500">
                      Commitment: {formatSar(r.legalCommitmentHalalas)}
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
