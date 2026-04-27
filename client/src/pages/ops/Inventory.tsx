import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  if (s === "ready_for_listing") return "bg-emerald-100 text-emerald-700";
  if (s.startsWith("pending") || s.includes("inspection"))
    return "bg-amber-100 text-amber-800";
  if (s === "withdrawn" || s === "lost_or_destroyed")
    return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  const filtered = (data ?? []).filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      (item.warehouseLocationCode ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = [...new Set((data ?? []).map((i) => i.status))].sort();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-6">
        All assets tracked by the MLR warehouse.
      </p>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search by title, brand, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
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

      <p className="text-sm text-neutral-400 mb-4">
        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        {statusFilter !== "all" && ` (${statusFilter.replace(/_/g, " ")})`}
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : filtered.length === 0 ? (
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
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Brand</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-right p-4 font-medium">Value</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="p-4 font-mono text-xs">#{item.id}</td>
                    <td className="p-4 font-medium">{item.brand}</td>
                    <td className="p-4">{item.title}</td>
                    <td className="p-4">
                      {item.warehouseLocationCode ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono bg-neutral-100 px-2 py-1 rounded">
                          <MapPin className="w-3 h-3" />
                          {item.warehouseLocationCode}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-xs">
                      {item.evaluatedValueHalalas
                        ? formatSar(item.evaluatedValueHalalas)
                        : "—"}
                    </td>
                    <td className="p-4">
                      <Badge className={`border-0 ${statusColor(item.status)}`}>
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-neutral-500">
                      {new Date(item.updatedAt).toLocaleDateString()}
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
