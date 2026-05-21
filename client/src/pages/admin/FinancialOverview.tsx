import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi, adminExtApi, formatSar } from "@/lib/api";

export default function FinancialOverview() {
  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];
  const maxTotal = Math.max(
    ...trend.map((t) => Number(t.total_halalas ?? 0)),
    1
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Financial overview</h1>
        <div className="flex gap-2">
          <a href={adminExtApi.exportFinancial()} target="_blank" rel="noopener">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export Transactions
            </Button>
          </a>
          <a href={adminExtApi.exportPayouts()} target="_blank" rel="noopener">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export Payouts
            </Button>
          </a>
        </div>
      </div>
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
    </div>
  );
}
