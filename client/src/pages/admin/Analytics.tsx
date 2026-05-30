import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { analyticsApi, formatSar } from "@/lib/api";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  confirmed: "#3b82f6",
  closed: "#6b7280",
  closed_with_penalty: "#f59e0b",
  pending_legal_signing: "#8b5cf6",
  pending_payment: "#ec4899",
  cancelled: "#ef4444",
  in_dispute: "#dc2626",
  enforcement: "#991b1b",
  out_for_delivery: "#06b6d4",
  under_inspection: "#a855f7",
};

export default function Analytics() {
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["analytics", "categories"],
    queryFn: () => analyticsApi.categories(),
  });

  const { data: rentalStatus } = useQuery({
    queryKey: ["analytics", "rental-status"],
    queryFn: () => analyticsApi.rentalStatus(),
  });

  const { data: topRenters } = useQuery({
    queryKey: ["analytics", "top-renters"],
    queryFn: () => analyticsApi.topRenters(),
  });

  const { data: topOwners } = useQuery({
    queryKey: ["analytics", "top-owners"],
    queryFn: () => analyticsApi.topOwners(),
  });

  const overdueDetect = useMutation({
    mutationFn: () => analyticsApi.triggerOverdueDetection(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const rentalStatusData = rentalStatus?.map((r) => ({
    name: r.status.replace(/_/g, " "),
    value: Number(r.count),
    fill: STATUS_COLORS[r.status] ?? "#9ca3af",
  }));

  const categoryData = categories?.map((c) => ({
    name: c.category,
    total: Number(c.total),
    listed: Number(c.listed),
    rented: Number(c.rented),
  }));

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Platform Analytics</h1>
            <p className="text-neutral-500">
              Detailed insights into platform performance
            </p>
          </div>
          <button
            onClick={() => overdueDetect.mutate()}
            disabled={overdueDetect.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {overdueDetect.isPending ? "Scanning..." : "Detect Overdue Rentals"}
          </button>
        </div>

        {overdueDetect.data && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Overdue scan complete: {overdueDetect.data.alertsCreated} new alert(s) created.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Assets by Category</h2>
              {categoryData && categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#d4d4d4" name="Total" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="listed" fill="#f59e0b" name="Listed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rented" fill="#10b981" name="Rented" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-neutral-400 text-sm py-8 text-center">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Rental Status Distribution</h2>
              {rentalStatusData && rentalStatusData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={260}>
                    <PieChart>
                      <Pie
                        data={rentalStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {rentalStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1">
                    {rentalStatusData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span className="truncate">{entry.name}</span>
                        <span className="ml-auto font-medium">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400 text-sm py-8 text-center">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Top Renters</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Rentals</th>
                      <th className="pb-2 font-medium">Trust</th>
                      <th className="pb-2 font-medium text-right">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topRenters?.map((r) => (
                      <tr key={r.renter_id}>
                        <td className="py-2">
                          <p className="font-medium">{r.full_name}</p>
                          <p className="text-xs text-neutral-400">{r.email}</p>
                        </td>
                        <td className="py-2">
                          {r.completed}/{r.total_rentals}
                        </td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              r.trust_score >= 70
                                ? "bg-green-100 text-green-700"
                                : r.trust_score >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {r.trust_score}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          {formatSar(Number(r.total_spent_halalas))}
                        </td>
                      </tr>
                    ))}
                    {(!topRenters || topRenters.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-neutral-400">
                          No rental data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Top Owners by Revenue</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Assets</th>
                      <th className="pb-2 font-medium">Rentals</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topOwners?.map((o) => (
                      <tr key={o.owner_id}>
                        <td className="py-2">
                          <p className="font-medium">{o.full_name}</p>
                          <p className="text-xs text-neutral-400">{o.email}</p>
                        </td>
                        <td className="py-2">{o.total_assets}</td>
                        <td className="py-2">{o.total_rentals}</td>
                        <td className="py-2 text-right">
                          {formatSar(Number(o.total_revenue_halalas))}
                        </td>
                      </tr>
                    ))}
                    {(!topOwners || topOwners.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-neutral-400">
                          No owner data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
