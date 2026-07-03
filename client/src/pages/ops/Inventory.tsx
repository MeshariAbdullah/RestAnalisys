import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { operationsApi } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "listed") return "bg-green-100 text-green-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s.startsWith("pending") || s.includes("inspection"))
    return "bg-amber-100 text-amber-800";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-8">
        All assets tracked by the MLR warehouse.
      </p>

      {isError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-4">
          Failed to load data. Please try again.
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <PackageSearch className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No inventory items.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Brand</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-4 font-mono text-xs">#{item.id}</td>
                    <td className="p-4">{item.brand}</td>
                    <td className="p-4">{item.title}</td>
                    <td className="p-4">
                      <Badge
                        className={`border-0 ${statusColor(item.status)}`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
