import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { paymentsApi, formatSar } from "@/lib/api";

type FilterStatus = "all" | "released" | "pending" | "processing";

export default function Payouts() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => paymentsApi.myPayouts(),
  });

  const payouts = data ?? [];
  const filtered =
    statusFilter === "all"
      ? payouts
      : payouts.filter((p) => p.status === statusFilter);

  const totalEarnings = payouts.reduce(
    (sum, p) => sum + Number(p.netHalalas ?? 0),
    0
  );
  const releasedTotal = payouts
    .filter((p) => p.status === "released")
    .reduce((sum, p) => sum + Number(p.netHalalas ?? 0), 0);
  const pendingTotal = payouts
    .filter((p) => p.status !== "released")
    .reduce((sum, p) => sum + Number(p.netHalalas ?? 0), 0);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const thisMonthPayouts = payouts.filter((p) => {
    const d = new Date(p.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthPayouts.reduce(
    (sum, p) => sum + Number(p.netHalalas ?? 0),
    0
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Payouts</h1>
      <p className="text-neutral-500 mb-8">
        Funds released to your registered IBAN after rentals close successfully.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Wallet className="w-4 h-4 text-amber-500" />
              Lifetime earnings
            </div>
            <p className="text-3xl font-bold">{formatSar(totalEarnings)}</p>
            <p className="text-xs text-neutral-500 mt-1">
              Across {payouts.length} payouts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              Released
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatSar(releasedTotal)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Successfully paid out
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              {currentMonth}
            </div>
            <p className="text-3xl font-bold">{formatSar(thisMonthTotal)}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {thisMonthPayouts.length} payouts this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Payout history</h2>
        <div className="flex gap-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "released", label: "Released" },
              { id: "pending", label: "Pending" },
              { id: "processing", label: "Processing" },
            ] as const
          ).map((f) => (
            <Button
              key={f.id}
              variant={statusFilter === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.id)}
              className={
                statusFilter === f.id ? "bg-neutral-900 text-white" : ""
              }
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {statusFilter === "all"
              ? "No payouts released yet."
              : `No ${statusFilter} payouts.`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      p.status === "released"
                        ? "bg-green-100"
                        : "bg-amber-100"
                    }`}
                  >
                    {p.status === "released" ? (
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-neutral-500">
                      Payout #{p.id}
                    </p>
                    <p className="text-sm font-medium mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("en-SA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <Badge
                    className={`border-0 ${
                      p.status === "released"
                        ? "bg-green-100 text-green-700"
                        : p.status === "processing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {p.status}
                  </Badge>
                  <p className="font-bold text-lg min-w-[100px] text-right">
                    {formatSar(Number(p.netHalalas))}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
