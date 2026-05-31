import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Truck, AlertTriangle, PackageSearch, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { operationsApi } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  listed: "#10b981",
  rented_out: "#3b82f6",
  pending_approval: "#f59e0b",
  in_inspection: "#8b5cf6",
  reserved: "#ec4899",
  completed: "#6b7280",
  withdrawn: "#9ca3af",
};

export default function OpsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["ops-summary"],
    queryFn: () => operationsApi.summary(),
  });

  const inventoryChart = (data?.inventoryCounts ?? []).map((c) => ({
    name: c.status.replace(/_/g, " "),
    count: Number(c.count),
    fill: STATUS_COLORS[c.status] ?? "#d4d4d4",
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Operations dashboard</h1>
      <p className="text-neutral-500 mb-8">
        Real-time picture of rentals, shipments, inventory and alerts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Activity className="w-4 h-4" /> Active rentals
            </div>
            <p className="text-3xl font-bold">
              {isLoading ? "..." : data?.activeRentals ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <AlertTriangle className="w-4 h-4" /> Late rentals
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? "..." : data?.lateRentals ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <AlertTriangle className="w-4 h-4" /> Open alerts
            </div>
            <p className="text-3xl font-bold text-red-600">
              {isLoading ? "..." : data?.openAlerts ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory chart */}
      <h2 className="text-lg font-semibold mb-3">Inventory by Status</h2>
      <Card className="mb-8">
        <CardContent className="p-6">
          {inventoryChart.length === 0 ? (
            <p className="text-sm text-neutral-500">No inventory data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={inventoryChart} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {inventoryChart.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink
          href="/ops/shipments"
          icon={Truck}
          title="Shipments"
          desc="Manage inbound and outbound logistics"
        />
        <QuickLink
          href="/ops/inventory"
          icon={PackageSearch}
          title="Inventory"
          desc="Warehouse locations and status"
        />
        <QuickLink
          href="/ops/alerts"
          icon={AlertTriangle}
          title="Alerts"
          desc="Risk and operational alerts"
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Truck;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <a>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <Icon className="w-8 h-8 text-amber-500 mb-3" />
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-neutral-500 mt-1">{desc}</p>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
