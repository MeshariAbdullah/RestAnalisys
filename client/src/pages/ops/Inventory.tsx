import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search, Package, CheckCircle, Truck, ClipboardCheck, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationsApi, formatSar } from "@/lib/api";

const STATUS_FILTERS = [
  { id: undefined, label: "All", icon: Package },
  { id: "listed", label: "Listed", icon: CheckCircle },
  { id: "rented_out", label: "Rented Out", icon: Truck },
  { id: "in_inspection", label: "In Inspection", icon: ClipboardCheck },
  { id: "pending", label: "Pending", icon: Clock },
] as const;

function statusColor(s: string): string {
  if (s === "listed") return "bg-green-100 text-green-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s.startsWith("pending") || s.includes("inspection"))
    return "bg-amber-100 text-amber-800";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  const statusCounts = useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    for (const item of data) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => {
      const matchesSearch = search
        ? `${item.brand} ${item.title}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesStatus = statusFilter
        ? statusFilter === "pending"
          ? item.status.startsWith("pending")
          : statusFilter === "in_inspection"
            ? item.status.includes("inspection")
            : item.status === statusFilter
        : true;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-6">
        All assets tracked by the MLR warehouse.
      </p>

      {/* Summary stats */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                Total
              </p>
              <p className="text-2xl font-bold mt-1">{data.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-medium uppercase tracking-wider">
                Listed
              </p>
              <p className="text-2xl font-bold mt-1">
                {statusCounts["listed"] || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                Rented Out
              </p>
              <p className="text-2xl font-bold mt-1">
                {statusCounts["rented_out"] || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">
                In Inspection
              </p>
              <p className="text-2xl font-bold mt-1">
                {Object.entries(statusCounts)
                  .filter(([k]) => k.includes("inspection"))
                  .reduce((sum, [, v]) => sum + v, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Status filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search brand or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.label}
              variant={statusFilter === f.id ? "default" : "outline"}
              onClick={() => setStatusFilter(f.id)}
              className={
                statusFilter === f.id ? "bg-neutral-900 text-white" : ""
              }
              size="sm"
            >
              <f.icon className="w-4 h-4 mr-1.5" />
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <PackageSearch className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-1">
              No inventory items
            </h3>
            <p className="text-neutral-500 text-sm">
              Assets will appear here once they are submitted and processed.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="text-neutral-500">
              No assets match your search or filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Brand</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Category</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-right p-4 font-medium">Value (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-neutral-50/50">
                    <td className="p-4 font-mono text-xs">#{item.id}</td>
                    <td className="p-4">{item.brand}</td>
                    <td className="p-4">{item.title}</td>
                    <td className="p-4 capitalize">{item.category}</td>
                    <td className="p-4">
                      <Badge
                        className={`border-0 ${statusColor(item.status)}`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs text-neutral-600">
                      {item.warehouseLocationCode || "-"}
                    </td>
                    <td className="p-4 text-right">
                      {formatSar(item.evaluatedValueHalalas)}
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
