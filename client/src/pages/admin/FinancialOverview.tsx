import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, ArrowDownCircle, ArrowUpCircle, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar } from "@/lib/api";

export default function FinancialOverview() {
  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const trendQuery = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => adminApi.revenueTrend(),
  });

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats(),
  });

  const kpis = kpisQuery.data;
  const trend = trendQuery.data ?? [];
  const stats = statsQuery.data;
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

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <ArrowUpCircle className="w-4 h-4 text-green-500" />
                Captured payments
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatSar(stats.payments.capturedHalalas)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <ArrowDownCircle className="w-4 h-4 text-red-500" />
                Refunded
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatSar(stats.payments.refundedHalalas)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {formatSar(stats.payments.pendingHalalas)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-neutral-400" />
            Asset categories
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.categoryBreakdown.map((cat: any) => (
                  <div key={cat.category} className="text-center">
                    <p className="text-sm font-medium capitalize">{cat.category}</p>
                    <p className="text-2xl font-bold mt-1">{cat.count}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Badge className="bg-green-100 text-green-700 text-[10px]">
                        {cat.listed} listed
                      </Badge>
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                        {cat.rented} rented
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
