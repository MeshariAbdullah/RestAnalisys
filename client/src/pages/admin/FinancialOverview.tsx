import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminApi, rentalsApi, paymentsApi, formatSar, type Rental } from "@/lib/api";

export default function FinancialOverview() {
  const qc = useQueryClient();
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payingOut, setPayingOut] = useState<number | null>(null);

  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const rentalsQuery = useQuery({
    queryKey: ["rentals-closed"],
    queryFn: () => rentalsApi.list(),
  });

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];
  const maxTotal = Math.max(
    ...trend.map((t) => Number(t.total_halalas ?? 0)),
    1
  );

  const closedRentals = (rentalsQuery.data ?? []).filter(
    (r: Rental) => r.status === "closed"
  );

  async function releasePayout(rentalId: number) {
    setPayingOut(rentalId);
    setPayoutError(null);
    setPayoutSuccess(null);
    try {
      const result = await paymentsApi.releasePayout(rentalId);
      setPayoutSuccess(
        `Payout of ${formatSar(result.netHalalas)} released for rental #${rentalId}`
      );
      await qc.invalidateQueries({ queryKey: ["rentals-closed"] });
    } catch (err) {
      setPayoutError((err as Error).message);
    } finally {
      setPayingOut(null);
    }
  }

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
      <Card className="mb-8">
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

      {/* Owner Payouts */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Wallet className="w-5 h-5" />
        Owner payouts
      </h2>

      {payoutSuccess && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {payoutSuccess}
        </div>
      )}
      {payoutError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {payoutError}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          {closedRentals.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              No closed rentals eligible for payout.
            </p>
          ) : (
            <div className="space-y-3">
              {closedRentals.map((rental: Rental) => (
                <div
                  key={rental.id}
                  className="flex items-center gap-4 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500">
                      {rental.reference}
                    </p>
                    <p className="font-semibold text-sm">
                      {rental.startDate} → {rental.endDate}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Total: {formatSar(rental.totalPayableHalalas)}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    {rental.status.replace(/_/g, " ")}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => releasePayout(rental.id)}
                    disabled={payingOut === rental.id}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    <Wallet className="w-4 h-4 mr-1" />
                    {payingOut === rental.id ? "..." : "Release payout"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
