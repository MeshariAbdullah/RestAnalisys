import React from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { adminApi, formatSar } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function PlatformStats() {
  const { data: rentalStats } = useQuery({
    queryKey: ["stats-rental-status"],
    queryFn: () => adminApi.rentalStatusStats(),
  });

  const { data: categoryStats } = useQuery({
    queryKey: ["stats-asset-categories"],
    queryFn: () => adminApi.assetCategoryStats(),
  });

  const { data: userGrowth } = useQuery({
    queryKey: ["stats-user-growth"],
    queryFn: () => adminApi.userGrowth(),
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    closed: "bg-blue-100 text-blue-800",
    closed_with_penalty: "bg-orange-100 text-orange-800",
    pending_legal_signing: "bg-yellow-100 text-yellow-800",
    pending_payment: "bg-purple-100 text-purple-800",
    confirmed: "bg-teal-100 text-teal-800",
    cancelled: "bg-red-100 text-red-800",
    enforcement: "bg-red-200 text-red-900",
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Platform Statistics</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rental Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="w-4 h-4" />
                Rental Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rentalStats ? (
                <div className="space-y-2">
                  {rentalStats.map((row) => (
                    <div key={row.status} className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={statusColors[row.status] ?? "bg-neutral-100 text-neutral-700"}
                      >
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-mono text-sm font-medium">{row.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 text-sm">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Asset Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4" />
                Asset Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryStats && categoryStats.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={categoryStats.map((r) => ({
                        name: r.category,
                        count: Number(r.count),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1">
                    {categoryStats.map((r) => (
                      <div key={r.category} className="flex justify-between text-sm">
                        <span className="capitalize">{r.category}</span>
                        <span className="text-neutral-500">
                          {r.count} items — {formatSar(Number(r.total_value_halalas))}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-neutral-500 text-sm">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* User Growth (30 days) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4" />
                User Growth (last 30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userGrowth && userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={userGrowth.map((r) => ({
                      day: r.day.slice(5),
                      users: Number(r.new_users),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-neutral-500 text-sm">No user growth data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
