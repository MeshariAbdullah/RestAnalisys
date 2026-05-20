import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Truck, AlertTriangle, PackageSearch, Activity } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { operationsApi } from "@/lib/api";

export default function OpsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["ops-summary"],
    queryFn: () => operationsApi.summary(),
  });

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
              {isLoading ? "…" : data?.activeRentals ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <AlertTriangle className="w-4 h-4" /> Late rentals
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? "…" : data?.lateRentals ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <AlertTriangle className="w-4 h-4" /> Open alerts
            </div>
            <p className="text-3xl font-bold text-red-600">
              {isLoading ? "…" : data?.openAlerts ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Inventory by status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {(data?.inventoryCounts ?? []).map((c) => (
            <Card key={c.status}>
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500">
                  {c.status.replace(/_/g, " ")}
                </p>
                <p className="font-bold text-xl mt-1">{c.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {(data?.inventoryCounts ?? []).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={(data?.inventoryCounts ?? []).map((c) => ({
                      name: c.status.replace(/_/g, " "),
                      value: c.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {(data?.inventoryCounts ?? []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={["#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6", "#3b82f6"][i % 6]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

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
