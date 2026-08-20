import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar, halalasToSar } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function SarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-sm px-3 py-2 text-sm">
      <p className="font-medium text-neutral-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {formatSar(p.value * 100)}
        </p>
      ))}
    </div>
  );
}

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
  const trend = (trendQuery.data ?? []).map((t) => ({
    date: new Date(t.day).toLocaleDateString("en-SA", {
      month: "short",
      day: "numeric",
    }),
    revenue: halalasToSar(Number(t.total_halalas ?? 0)),
    fees: halalasToSar(Number(t.fee_halalas ?? 0)),
    rentals: Number(t.rentals ?? 0),
  }));

  const totalRevenue = kpis?.revenue.rentalSubtotalHalalas ?? 0;
  const totalFees = kpis?.revenue.platformFeeHalalas ?? 0;
  const totalVat = kpis?.revenue.vatHalalas ?? 0;

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
              {formatSar(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <DollarSign className="w-4 h-4" />
              Platform fees
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(totalFees)}
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
              {formatSar(totalVat)}
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={trend}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#737373" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e5e5" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#737373" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toLocaleString()} SAR`}
                  width={100}
                />
                <Tooltip content={<SarTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="fees"
                  name="Platform fees"
                  fill="#78716c"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
