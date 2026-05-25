import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { operationsApi, formatSar } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "listed") return "bg-green-100 text-green-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s === "reserved") return "bg-purple-100 text-purple-700";
  if (s.startsWith("pending") || s.includes("inspection") || s.includes("awaiting"))
    return "bg-amber-100 text-amber-800";
  if (s === "withdrawn" || s === "lost_or_destroyed")
    return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  const items = (data ?? []).filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term) ||
        String(item.id).includes(term)
      );
    }
    return true;
  });

  const statuses = [...new Set((data ?? []).map((i) => i.status))].sort();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-6">
        All assets tracked by the MLR warehouse.{" "}
        {data && (
          <span className="font-medium text-neutral-700">
            {data.length} items
          </span>
        )}
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search brand, title, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-neutral-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <PackageSearch className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {search || statusFilter !== "all"
              ? "No items match your filters."
              : "No inventory items."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left p-4 font-medium">ID</th>
                    <th className="text-left p-4 font-medium">Brand</th>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Location</th>
                    <th className="text-right p-4 font-medium">Value</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-neutral-50/50"
                    >
                      <td className="p-4 font-mono text-xs">#{item.id}</td>
                      <td className="p-4 font-medium">{item.brand}</td>
                      <td className="p-4 max-w-[200px] truncate">{item.title}</td>
                      <td className="p-4">
                        <Badge
                          className={`border-0 ${statusColor(item.status)}`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {(item as any).warehouseLocationCode ? (
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                            <MapPin className="w-3 h-3" />
                            {(item as any).warehouseLocationCode}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-xs">
                        {formatSar((item as any).evaluatedValueHalalas)}
                      </td>
                      <td className="p-4 text-xs text-neutral-500">
                        {(item as any).updatedAt
                          ? new Date((item as any).updatedAt).toLocaleDateString("en-SA")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
