import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { adminApi, formatSar } from "@/lib/api";

export default function OverdueRentals() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overdue"],
    queryFn: () => adminApi.overdueRentals(),
    refetchInterval: 60_000,
  });

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold">Overdue Rentals</h1>
            <p className="text-neutral-500">Active rentals past their return date</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : !data || data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-green-600">No overdue rentals</p>
              <p className="text-sm text-neutral-500 mt-1">All active rentals are within their return date.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">
                  <strong>{data.length}</strong> rental{data.length > 1 ? "s" : ""} overdue. Late return penalties may apply.
                </p>
              </CardContent>
            </Card>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-100 text-left">
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Renter ID</th>
                    <th className="px-4 py-3 font-medium">Asset ID</th>
                    <th className="px-4 py-3 font-medium">End Date</th>
                    <th className="px-4 py-3 font-medium text-right">Days Late</th>
                    <th className="px-4 py-3 font-medium text-right">Daily Price</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-neutral-50">
                      <td className="px-4 py-3 font-mono font-medium">{r.reference}</td>
                      <td className="px-4 py-3">{r.renterId}</td>
                      <td className="px-4 py-3">{r.assetId}</td>
                      <td className="px-4 py-3">{r.endDate}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            r.lateDays >= 7
                              ? "bg-red-100 text-red-700"
                              : r.lateDays >= 3
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {r.lateDays} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatSar(r.dailyPriceHalalas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
