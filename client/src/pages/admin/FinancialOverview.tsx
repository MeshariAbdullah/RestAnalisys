import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, TrendingUp, Banknote, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi, rentalsApi, paymentsApi, formatSar, type Rental } from "@/lib/api";

export default function FinancialOverview() {
  const queryClient = useQueryClient();
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const rentalsQuery = useQuery({
    queryKey: ["rentals"],
    queryFn: () => rentalsApi.list(),
  });

  const pendingPayouts: Rental[] = (rentalsQuery.data ?? []).filter(
    (r: Rental) => typeof r.status === "string" && r.status.includes("closed")
  );

  async function handleReleasePayout(rentalId: number) {
    setReleasingId(rentalId);
    setReleaseError(null);
    try {
      await paymentsApi.releasePayout(rentalId);
      await queryClient.invalidateQueries({ queryKey: ["rentals"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-kpis"] });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to release payout";
      setReleaseError(message);
    } finally {
      setReleasingId(null);
    }
  }

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];
  const maxTotal = Math.max(
    ...trend.map((t) => Number(t.total_halalas ?? 0)),
    1
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Financial overview</h1>
      <p className="text-neutral-500 mb-8">
        Revenue, fees and VAT across all confirmed rentals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Gross revenue
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              Platform fees
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(kpis?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" />
              VAT collected (15%)
            </div>
            <p className="text-3xl font-bold">
              {formatSar(kpis?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Last 30 days</h2>
      <Card>
        <CardContent className="p-6">
          {trend.length === 0 ? (
            <p className="text-neutral-500 text-sm">No recent rentals.</p>
          ) : (
            <div className="space-y-2">
              {trend.map((t) => {
                const pct = (Number(t.total_halalas) / maxTotal) * 100;
                return (
                  <div
                    key={t.day}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-24 text-neutral-500 shrink-0">
                      {new Date(t.day).toLocaleDateString()}
                    </span>
                    <div className="flex-1 h-6 bg-neutral-100 rounded">
                      <div
                        className="h-full bg-amber-500 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-mono">
                      {formatSar(Number(t.total_halalas))}
                    </span>
                    <span className="w-16 text-right text-xs text-neutral-500">
                      {t.rentals} rentals
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending payouts ── */}
      <h2 className="text-lg font-semibold mt-10 mb-3 flex items-center gap-2">
        <Banknote className="w-5 h-5 text-amber-600" />
        Pending payouts
      </h2>

      {releaseError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {releaseError}
        </div>
      )}

      {rentalsQuery.isLoading ? (
        <p className="text-neutral-500 text-sm">Loading rentals...</p>
      ) : pendingPayouts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-neutral-500 text-sm">
              No closed rentals awaiting payout.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingPayouts.map((rental) => (
            <Card key={rental.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    Rental #{rental.id}
                    <span className="ml-2 text-xs text-neutral-500">
                      {rental.status}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    Owner: {rental.ownerId}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-semibold">
                    {formatSar(rental.totalPayableHalalas)}
                  </span>
                  <Button
                    size="sm"
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    disabled={releasingId === rental.id}
                    onClick={() => handleReleasePayout(rental.id)}
                  >
                    {releasingId === rental.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Releasing...
                      </>
                    ) : (
                      "Release payout"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
