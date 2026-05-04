import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { operationsApi, formatSar } from "@/lib/api";

const STATUSES = [
  "all",
  "listed",
  "rented_out",
  "pending_approval",
  "in_inspection",
  "returned_under_inspection",
  "reserved",
  "completed",
  "withdrawn",
];

function statusColor(s: string): string {
  if (s === "listed") return "bg-green-100 text-green-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s === "reserved") return "bg-purple-100 text-purple-700";
  if (s.startsWith("pending") || s.includes("inspection"))
    return "bg-amber-100 text-amber-800";
  if (s === "withdrawn" || s === "lost_or_destroyed")
    return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data;
    if (statusFilter !== "all") {
      items = items.filter((i: any) => i.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i: any) =>
          i.title?.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, statusFilter, search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-6">
        All assets tracked by the MLR warehouse.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search brand or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                statusFilter === s
                  ? "bg-amber-500 text-neutral-950 font-medium"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-3">
        Showing {filtered.length} of {data?.length ?? 0} items
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <PackageSearch className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No inventory items match your filters.
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
                  <th className="text-left p-4 font-medium">Value</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="p-4 font-mono text-xs">#{item.id}</td>
                    <td className="p-4 font-medium">{item.brand}</td>
                    <td className="p-4">{item.title}</td>
                    <td className="p-4 text-xs font-mono">
                      {item.evaluatedValueHalalas
                        ? formatSar(item.evaluatedValueHalalas)
                        : "–"}
                    </td>
                    <td className="p-4 text-xs text-neutral-500">
                      {item.warehouseLocationCode ?? "–"}
                    </td>
                    <td className="p-4">
                      <Badge className={`border-0 ${statusColor(item.status)}`}>
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
