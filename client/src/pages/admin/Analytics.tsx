import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { adminApi, formatSar } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  confirmed: "bg-blue-500",
  closed: "bg-neutral-400",
  closed_with_penalty: "bg-orange-500",
  cancelled: "bg-neutral-300",
  pending_legal_signing: "bg-yellow-500",
  pending_payment: "bg-yellow-400",
  out_for_delivery: "bg-cyan-500",
  under_inspection: "bg-purple-500",
  enforcement: "bg-red-500",
  in_dispute: "bg-red-400",
};

export default function Analytics() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["analytics-categories"],
    queryFn: () => adminApi.categoryAnalytics(),
  });

  const statusQuery = useQuery({
    queryKey: ["analytics-rental-status"],
    queryFn: () => adminApi.rentalStatusAnalytics(),
  });

  const overdueMutation = useMutation({
    mutationFn: () => adminApi.detectOverdue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-rental-status"] });
    },
  });

  const categories = categoriesQuery.data ?? [];
  const statuses = statusQuery.data ?? [];

  const maxCategoryTotal = Math.max(...categories.map((c) => c.total), 1);
  const totalRentals = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-7 h-7 text-amber-600" />
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>
      <p className="text-neutral-500 mb-8">
        Asset distribution, rental breakdown, and overdue detection.
      </p>

      {/* Overdue detection */}
      <Card className="mb-8 border-amber-200 bg-amber-50/30">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium">Overdue rental detection</p>
              <p className="text-sm text-neutral-500">
                Scan active rentals past their end date and create operational alerts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {overdueMutation.isSuccess && (
              <span className="text-sm text-neutral-600">
                {overdueMutation.data.overdueRentals} overdue,{" "}
                {overdueMutation.data.alertsCreated} new alerts
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => overdueMutation.mutate()}
              disabled={overdueMutation.isPending}
            >
              <Clock className="w-4 h-4 mr-2" />
              {overdueMutation.isPending ? "Scanning…" : "Run scan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category distribution */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Asset categories</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              {categoriesQuery.isLoading ? (
                <p className="text-neutral-400 text-sm">Loading…</p>
              ) : categories.length === 0 ? (
                <p className="text-neutral-400 text-sm">No assets yet.</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">
                        {cat.category}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {cat.total} total · {cat.listed} listed · {cat.rented} rented
                      </span>
                    </div>
                    <Progress
                      value={(cat.total / maxCategoryTotal) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                      Total evaluated: {formatSar(cat.totalValueHalalas)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rental status breakdown */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Rental status breakdown</h2>
          <Card>
            <CardContent className="p-6 space-y-3">
              {statusQuery.isLoading ? (
                <p className="text-neutral-400 text-sm">Loading…</p>
              ) : statuses.length === 0 ? (
                <p className="text-neutral-400 text-sm">No rentals yet.</p>
              ) : (
                statuses.map((s) => {
                  const pct = totalRentals > 0 ? (s.count / totalRentals) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ${STATUS_COLORS[s.status] ?? "bg-neutral-300"}`}
                      />
                      <span className="text-sm flex-1">{s.status.replace(/_/g, " ")}</span>
                      <Badge variant="secondary" className="text-xs">
                        {s.count}
                      </Badge>
                      <span className="text-xs text-neutral-400 w-12 text-right">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-xs text-neutral-500 w-24 text-right">
                        {formatSar(s.totalValueHalalas)}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
