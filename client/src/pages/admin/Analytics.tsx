import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Diamond, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { adminApi, formatSar } from "@/lib/api";

export default function Analytics() {
  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => adminApi.categoryBreakdown(),
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ["admin-monthly"],
    queryFn: () => adminApi.monthlyPerformance(),
  });

  const { data: topAssets, isLoading: topLoading } = useQuery({
    queryKey: ["admin-top-assets"],
    queryFn: () => adminApi.topAssets(),
  });

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-neutral-500">Platform performance and insights</p>
          </div>
        </div>

        {/* Category Breakdown */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Diamond className="w-5 h-5" /> Asset Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {catLoading ? (
            <p className="text-neutral-500 col-span-full">Loading...</p>
          ) : (
            categories?.map((cat) => (
              <Card key={cat.category}>
                <CardContent className="p-5">
                  <p className="text-lg font-semibold capitalize mb-2">{cat.category}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-neutral-500">Total</p>
                      <p className="font-bold">{cat.total_assets}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Listed</p>
                      <p className="font-bold text-green-600">{cat.listed}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Rented</p>
                      <p className="font-bold text-amber-600">{cat.rented}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Avg Value</p>
                      <p className="font-bold">{formatSar(Number(cat.avg_value_halalas))}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-neutral-500">Total Portfolio Value</p>
                    <p className="font-bold text-lg">{formatSar(Number(cat.total_value_halalas))}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Monthly Performance */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Monthly Performance (12 months)
        </h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Completed</th>
                <th className="px-4 py-3 font-medium text-right">Cancelled</th>
                <th className="px-4 py-3 font-medium text-right">Disputed</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Fees</th>
              </tr>
            </thead>
            <tbody>
              {monthlyLoading ? (
                <tr><td colSpan={7} className="p-4 text-center text-neutral-500">Loading...</td></tr>
              ) : (
                monthly?.map((m) => (
                  <tr key={m.month} className="border-b hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium">{m.month}</td>
                    <td className="px-4 py-3 text-right">{m.total_rentals}</td>
                    <td className="px-4 py-3 text-right text-green-600">{m.completed}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">{m.cancelled}</td>
                    <td className="px-4 py-3 text-right text-red-500">{m.disputed}</td>
                    <td className="px-4 py-3 text-right">{formatSar(Number(m.revenue_halalas))}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatSar(Number(m.fees_halalas))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Top Assets */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" /> Top Assets by Revenue
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Rentals</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Fees</th>
              </tr>
            </thead>
            <tbody>
              {topLoading ? (
                <tr><td colSpan={7} className="p-4 text-center text-neutral-500">Loading...</td></tr>
              ) : (
                topAssets?.map((a, i) => (
                  <tr key={a.id} className="border-b hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{a.title}</td>
                    <td className="px-4 py-3">{a.brand}</td>
                    <td className="px-4 py-3 capitalize">{a.category}</td>
                    <td className="px-4 py-3 text-right">{a.rental_count}</td>
                    <td className="px-4 py-3 text-right">{formatSar(Number(a.total_revenue_halalas))}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatSar(Number(a.total_fees_halalas))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
