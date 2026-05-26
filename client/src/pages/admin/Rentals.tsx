import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_GROUPS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "problem", label: "Problems" },
] as const;

function statusGroup(s: string): string {
  if (["closed", "closed_with_penalty", "cancelled"].includes(s))
    return "completed";
  if (["in_dispute", "enforcement"].includes(s)) return "problem";
  return "active";
}

function statusColor(s: string): string {
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "closed") return "bg-green-100 text-green-700";
  if (["confirmed", "out_for_delivery"].includes(s))
    return "bg-blue-100 text-blue-700";
  if (s.startsWith("pending") || s === "under_inspection" || s === "return_in_transit")
    return "bg-amber-100 text-amber-800";
  if (["in_dispute", "enforcement", "closed_with_penalty"].includes(s))
    return "bg-red-100 text-red-700";
  if (s === "cancelled") return "bg-neutral-200 text-neutral-600";
  return "bg-neutral-200 text-neutral-700";
}

export default function AdminRentals() {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rentals"],
    queryFn: () => rentalsApi.list(),
  });

  const rentals = data ?? [];

  const stats = useMemo(() => {
    return {
      total: rentals.length,
      active: rentals.filter((r) => statusGroup(r.status) === "active").length,
      completed: rentals.filter((r) => statusGroup(r.status) === "completed")
        .length,
      problems: rentals.filter((r) => statusGroup(r.status) === "problem")
        .length,
      totalRevenue: rentals.reduce(
        (sum, r) => sum + (r.totalPayableHalalas ?? 0),
        0
      ),
    };
  }, [rentals]);

  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      const matchesGroup =
        groupFilter === "all" || statusGroup(r.status) === groupFilter;
      const matchesSearch = search
        ? r.reference.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesGroup && matchesSearch;
    });
  }, [rentals, groupFilter, search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Rentals</h1>
      <p className="text-neutral-500 mb-6">
        All rental contracts on the platform.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <Package className="w-4 h-4" />
              Total
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              Active
            </div>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
              <ShieldAlert className="w-4 h-4" />
              Problems
            </div>
            <p className="text-2xl font-bold">{stats.problems}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
              Total revenue
            </div>
            <p className="text-2xl font-bold">
              {formatSar(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search by reference (MLR-...)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_GROUPS.map((g) => (
            <Button
              key={g.id}
              variant={groupFilter === g.id ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupFilter(g.id)}
              className={
                groupFilter === g.id ? "bg-neutral-900 text-white" : ""
              }
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {search ? "No rentals match your search." : "No rentals found."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50 text-left">
                <tr>
                  <th className="p-4 font-medium">Reference</th>
                  <th className="p-4 font-medium">Period</th>
                  <th className="p-4 font-medium">Days</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Total</th>
                  <th className="p-4 font-medium text-right">Commitment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className="p-4 font-mono text-xs">{r.reference}</td>
                    <td className="p-4 text-neutral-600">
                      {r.startDate} - {r.endDate}
                    </td>
                    <td className="p-4">{r.durationDays}</td>
                    <td className="p-4">
                      <Badge
                        className={`border-0 ${statusColor(r.status)}`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatSar(r.totalPayableHalalas)}
                    </td>
                    <td className="p-4 text-right text-neutral-600">
                      {formatSar(r.legalCommitmentHalalas)} ({r.legalCommitmentPct}%)
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
