import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  DollarSign,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyticsApi, formatSar } from "@/lib/api";

export default function Analytics() {
  const { data: health } = useQuery({
    queryKey: ["analytics-health"],
    queryFn: () => analyticsApi.platformHealth(),
  });

  const { data: categories } = useQuery({
    queryKey: ["analytics-categories"],
    queryFn: () => analyticsApi.assetsByCategory(),
  });

  const { data: funnel } = useQuery({
    queryKey: ["analytics-funnel"],
    queryFn: () => analyticsApi.rentalsFunnel(),
  });

  const { data: averages } = useQuery({
    queryKey: ["analytics-averages"],
    queryFn: () => analyticsApi.rentalsAverages(),
  });

  const { data: payoutsSummary } = useQuery({
    queryKey: ["analytics-payouts"],
    queryFn: () => analyticsApi.payoutsSummary(),
  });

  const { data: disputeStats } = useQuery({
    queryKey: ["analytics-disputes"],
    queryFn: () => analyticsApi.disputeStats(),
  });

  const { data: topRented } = useQuery({
    queryKey: ["analytics-top-rented"],
    queryFn: () => analyticsApi.topRented(),
  });

  const { data: revenue } = useQuery({
    queryKey: ["analytics-revenue-monthly"],
    queryFn: () => analyticsApi.revenueMonthly(),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-neutral-500 mt-1">
          Comprehensive insights across the platform.
        </p>
      </header>

      {/* Platform Health */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" /> Platform Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Active Rentals"
            value={health?.activeRentals ?? "..."}
            icon={TrendingUp}
          />
          <MetricCard
            label="Overdue Rentals"
            value={health?.overdueRentals ?? "..."}
            icon={Clock}
            variant={Number(health?.overdueRentals ?? 0) > 0 ? "danger" : "default"}
          />
          <MetricCard
            label="Avg Trust Score (30d)"
            value={health?.avgTrustScore30d ?? "..."}
            icon={ShieldCheck}
          />
          <MetricCard
            label="Asset Utilization"
            value={
              health?.assetUtilization
                ? `${(health.assetUtilization as any).utilization_pct}%`
                : "..."
            }
            icon={PieChart}
          />
        </div>
      </section>

      {/* Rental Averages */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" /> Rental Averages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Avg Duration"
            value={averages ? `${averages.avg_duration_days} days` : "..."}
            icon={Clock}
          />
          <MetricCard
            label="Avg Total"
            value={averages ? formatSar(Number(averages.avg_total_halalas)) : "..."}
            icon={DollarSign}
          />
          <MetricCard
            label="Avg Daily Price"
            value={averages ? formatSar(Number(averages.avg_daily_price_halalas)) : "..."}
            icon={DollarSign}
          />
          <MetricCard
            label="Total Rentals"
            value={averages?.total_rentals ?? "..."}
            icon={BarChart3}
          />
        </div>
      </section>

      {/* Asset Categories */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-600" /> Assets by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(categories ?? []).map((cat: any) => (
            <Card key={cat.category}>
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-neutral-500 capitalize">
                  {cat.category}
                </p>
                <p className="text-2xl font-bold mt-1">{cat.total}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge variant="outline">{cat.listed} listed</Badge>
                  <Badge variant="outline">{cat.rented} rented</Badge>
                </div>
                <p className="text-xs text-neutral-400 mt-2">
                  Avg value: {formatSar(Number(cat.avg_value_halalas))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Rental Funnel */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" /> Rental Status Funnel
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(funnel ?? []).map((item: any) => (
            <Card key={item.status}>
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {item.status.replace(/_/g, " ")}
                </p>
                <p className="text-2xl font-bold mt-1">{item.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Monthly Revenue */}
      {revenue && revenue.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Monthly Revenue
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 pr-4">Month</th>
                      <th className="pb-2 pr-4">Rentals</th>
                      <th className="pb-2 pr-4">Revenue</th>
                      <th className="pb-2 pr-4">Platform Fees</th>
                      <th className="pb-2">VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.map((row: any) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.month}</td>
                        <td className="py-2 pr-4">{row.rental_count}</td>
                        <td className="py-2 pr-4">{formatSar(Number(row.total_revenue_halalas))}</td>
                        <td className="py-2 pr-4">{formatSar(Number(row.platform_fee_halalas))}</td>
                        <td className="py-2">{formatSar(Number(row.vat_halalas))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Top Rented Assets */}
      {topRented && topRented.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Top Rented Assets
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 pr-4">Asset</th>
                      <th className="pb-2 pr-4">Brand</th>
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 pr-4">Daily Price</th>
                      <th className="pb-2 pr-4">Rentals</th>
                      <th className="pb-2">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRented.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{item.title}</td>
                        <td className="py-2 pr-4">{item.brand}</td>
                        <td className="py-2 pr-4 capitalize">{item.category}</td>
                        <td className="py-2 pr-4">{formatSar(Number(item.daily_rental_price_halalas))}</td>
                        <td className="py-2 pr-4 font-bold">{item.rental_count}</td>
                        <td className="py-2">{formatSar(Number(item.total_revenue_halalas))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Payouts Summary */}
      {payoutsSummary && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Payouts Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Payouts"
              value={payoutsSummary.total_payouts ?? 0}
              icon={BarChart3}
            />
            <MetricCard
              label="Paid"
              value={formatSar(Number(payoutsSummary.total_paid_halalas ?? 0))}
              icon={DollarSign}
            />
            <MetricCard
              label="Pending"
              value={formatSar(Number(payoutsSummary.total_pending_halalas ?? 0))}
              icon={Clock}
            />
            <MetricCard
              label="Total Commission"
              value={formatSar(Number(payoutsSummary.total_commission_halalas ?? 0))}
              icon={TrendingUp}
            />
          </div>
        </section>
      )}

      {/* Dispute Stats */}
      {disputeStats && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600" /> Dispute Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {((disputeStats as any).byStatus ?? []).map((item: any) => (
              <Card key={item.status}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {item.status.replace(/_/g, " ")}
                  </p>
                  <p className="text-2xl font-bold mt-1">{item.count}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {(disputeStats as any).avgResolutionHours && (
            <p className="mt-3 text-sm text-neutral-500">
              Average resolution time: {(disputeStats as any).avgResolutionHours} hours
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
  variant?: "default" | "danger";
}) {
  return (
    <Card className={variant === "danger" ? "border-red-200 bg-red-50/50" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
          <Icon className={`w-4 h-4 ${variant === "danger" ? "text-red-500" : ""}`} />
          {label}
        </div>
        <p className={`text-2xl font-bold ${variant === "danger" ? "text-red-600" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
