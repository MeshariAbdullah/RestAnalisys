import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, paymentsApi, rentalsApi, formatSar, type Rental } from "@/lib/api";

export default function FinancialOverview() {
  const qc = useQueryClient();
  const [payoutRentalId, setPayoutRentalId] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutResult, setPayoutResult] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const closedRentalsQuery = useQuery({
    queryKey: ["closed-rentals"],
    queryFn: () => rentalsApi.list(),
    select: (data: Rental[]) => data.filter((r) => r.status === "closed" || r.status === "closed_with_penalty"),
  });

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];
  const closedRentals = closedRentalsQuery.data ?? [];
  const maxTotal = Math.max(
    ...trend.map((t) => Number(t.total_halalas ?? 0)),
    1
  );

  async function handleReleasePayout(rentalId: number) {
    setPayoutLoading(true);
    setPayoutError(null);
    setPayoutResult(null);
    try {
      const result = await paymentsApi.releasePayout(rentalId);
      setPayoutResult(`Payout #${result.id} released: ${formatSar(result.netHalalas)}`);
      await qc.invalidateQueries({ queryKey: ["closed-rentals"] });
    } catch (err) {
      setPayoutError((err as Error).message ?? "Failed to release payout");
    } finally {
      setPayoutLoading(false);
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

      <h2 className="text-lg font-semibold mb-3 mt-8">Release payout</h2>
      <Card>
        <CardContent className="p-6">
          {closedRentals.length === 0 ? (
            <p className="text-neutral-500 text-sm">No closed rentals awaiting payout.</p>
          ) : (
            <div className="space-y-3">
              {closedRentals.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                    <p className="text-sm font-medium mt-0.5">
                      {r.startDate} - {r.endDate} ({r.durationDays} days)
                    </p>
                    <p className="text-xs text-neutral-500">
                      Total: {formatSar(r.totalPayableHalalas)} · Status: {r.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleReleasePayout(r.id)}
                    disabled={payoutLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Wallet className="w-4 h-4 mr-1" />
                    Release payout
                  </Button>
                </div>
              ))}
            </div>
          )}
          {payoutResult && (
            <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{payoutResult}</div>
          )}
          {payoutError && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{payoutError}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
