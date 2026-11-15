import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, rentalsApi, paymentsApi, formatSar, type Rental } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function FinancialOverview() {
  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const closedRentalsQuery = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
    select: (data) => data.filter(r => r.status === "closed" || r.status === "closed_with_penalty"),
  });

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];
  const maxTotal = Math.max(...trend.map((t) => Number(t.total_halalas ?? 0)), 1);

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
              <TrendingUp className="w-4 h-4" /> Gross revenue
            </div>
            <p className="text-3xl font-bold">{formatSar(kpis?.revenue.rentalSubtotalHalalas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" /> Platform fees
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatSar(kpis?.revenue.platformFeeHalalas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Receipt className="w-4 h-4" /> VAT collected (15%)
            </div>
            <p className="text-3xl font-bold">{formatSar(kpis?.revenue.vatHalalas)}</p>
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
                  <div key={t.day} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-neutral-500 shrink-0">
                      {new Date(t.day).toLocaleDateString()}
                    </span>
                    <div className="flex-1 h-6 bg-neutral-100 rounded">
                      <div className="h-full bg-amber-500 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-24 text-right font-mono">{formatSar(Number(t.total_halalas))}</span>
                    <span className="w-16 text-right text-xs text-neutral-500">{t.rentals} rentals</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">
        <DollarSign className="w-5 h-5 inline mr-1" />
        Closed rentals — owner payouts
      </h2>
      {closedRentalsQuery.isLoading ? (
        <p className="text-neutral-500 text-sm">Loading...</p>
      ) : (closedRentalsQuery.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-neutral-500 text-sm">No closed rentals awaiting payout.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(closedRentalsQuery.data ?? []).map(r => (
            <PayoutRow key={r.id} rental={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutRow({ rental }: { rental: Rental }) {
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function handlePayout() {
    setLoading(true);
    try {
      const result = await paymentsApi.releasePayout(rental.id);
      addToast(`Payout released: ${formatSar(result.netHalalas)} for ${rental.reference}`);
      setPaid(true);
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
    } catch (e: any) {
      addToast(e.message ?? "Failed to release payout", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <p className="text-sm mt-1">{rental.startDate} → {rental.endDate}</p>
          <Badge className={`mt-1 border-0 text-xs ${rental.status === "closed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {rental.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">Subtotal</p>
          <p className="font-semibold">{formatSar(rental.rentalSubtotalHalalas)}</p>
        </div>
        <Button
          size="sm"
          disabled={loading || paid}
          onClick={handlePayout}
          className={paid ? "bg-green-600" : ""}
        >
          {paid ? "Paid" : loading ? "Processing..." : "Release Payout"}
        </Button>
      </CardContent>
    </Card>
  );
}
