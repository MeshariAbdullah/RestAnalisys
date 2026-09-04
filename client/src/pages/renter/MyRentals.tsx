import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Package, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";
import { getRentalStatusLabel, getRentalStatusColor } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${getRentalStatusColor(status)} hover:opacity-90 border-0`}>
      {getRentalStatusLabel(status)}
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
              Browse the collection &rarr;
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((r: Rental) => (
            <Link key={r.id} href={`/my-rentals/${r.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6 flex-wrap">
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
                      <div className="mt-3">
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-xs text-neutral-500 uppercase">Total paid</p>
                        <p className="font-bold text-lg">
                          {formatSar(r.totalPayableHalalas)}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Commitment {formatSar(r.legalCommitmentHalalas)} (
                          {r.legalCommitmentPct}%)
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
