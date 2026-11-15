import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, AlertTriangle, PackageSearch, Activity, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { operationsApi, rentalsApi, formatSar, type Rental } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const ACTION_MAP: Record<string, { label: string; action: (id: number) => Promise<Rental>; color: string }> = {
  confirmed: { label: "Mark Fulfilled", action: (id) => rentalsApi.fulfill(id), color: "bg-blue-600 hover:bg-blue-700" },
  out_for_delivery: { label: "Mark Delivered", action: (id) => rentalsApi.delivered(id), color: "bg-green-600 hover:bg-green-700" },
  active: { label: "Mark Returned", action: (id) => rentalsApi.returned(id), color: "bg-amber-600 hover:bg-amber-700" },
  return_in_transit: { label: "Mark Returned", action: (id) => rentalsApi.returned(id), color: "bg-amber-600 hover:bg-amber-700" },
};

const ACTIONABLE_STATUSES = Object.keys(ACTION_MAP);

export default function OpsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["ops-summary"],
    queryFn: () => operationsApi.summary(),
  });

  const rentalsQuery = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const actionableRentals = (rentalsQuery.data ?? []).filter(r => ACTIONABLE_STATUSES.includes(r.status));

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
            <p className="text-3xl font-bold">{isLoading ? "…" : data?.activeRentals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <AlertTriangle className="w-4 h-4" /> Late rentals
            </div>
            <p className="text-3xl font-bold text-amber-600">{isLoading ? "…" : data?.lateRentals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <AlertTriangle className="w-4 h-4" /> Open alerts
            </div>
            <p className="text-3xl font-bold text-red-600">{isLoading ? "…" : data?.openAlerts ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Inventory by status</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {(data?.inventoryCounts ?? []).map((c) => (
          <Card key={c.status}>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">{c.status.replace(/_/g, " ")}</p>
              <p className="font-bold text-xl mt-1">{c.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {actionableRentals.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Rental actions needed</h2>
          <div className="space-y-3 mb-8">
            {actionableRentals.map(r => (
              <RentalActionCard key={r.id} rental={r} />
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/ops/shipments" icon={Truck} title="Shipments" desc="Manage inbound and outbound logistics" />
        <QuickLink href="/ops/inventory" icon={PackageSearch} title="Inventory" desc="Warehouse locations and status" />
        <QuickLink href="/ops/alerts" icon={AlertTriangle} title="Alerts" desc="Risk and operational alerts" />
      </div>
    </div>
  );
}

function RentalActionCard({ rental }: { rental: Rental }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const config = ACTION_MAP[rental.status];
  if (!config) return null;

  async function handleAction() {
    setLoading(true);
    try {
      await config.action(rental.id);
      addToast(`${config.label} — ${rental.reference}`);
      queryClient.invalidateQueries({ queryKey: ["rentals-all"] });
      queryClient.invalidateQueries({ queryKey: ["ops-summary"] });
    } catch (e: any) {
      addToast(e.message ?? "Action failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <p className="text-sm mt-1">
            {rental.startDate} → {rental.endDate}
            <span className="text-neutral-500 ml-2">({rental.durationDays} days)</span>
          </p>
          <Badge className="mt-1 bg-neutral-100 text-neutral-600 border-0 text-xs">
            {rental.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="text-right mr-2">
          <p className="text-xs text-neutral-500">Total</p>
          <p className="font-semibold">{formatSar(rental.totalPayableHalalas)}</p>
        </div>
        <Button
          className={`text-white ${config.color}`}
          disabled={loading}
          onClick={handleAction}
        >
          {loading ? "Processing..." : config.label}
          {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
        </Button>
      </CardContent>
    </Card>
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
