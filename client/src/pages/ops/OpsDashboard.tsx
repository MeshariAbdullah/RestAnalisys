import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  AlertTriangle,
  PackageSearch,
  Activity,
  PackageCheck,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { operationsApi, rentalsApi, formatSar, type Rental } from "@/lib/api";
import { toast } from "@/lib/useToast";

const ACTIONABLE_STATUSES = ["confirmed", "out_for_delivery", "active", "return_in_transit"];

export default function OpsDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ops-summary"],
    queryFn: () => operationsApi.summary(),
  });

  const rentalsQuery = useQuery({
    queryKey: ["ops-rentals"],
    queryFn: () => rentalsApi.list(),
  });

  const fulfillMut = useMutation({
    mutationFn: (id: number) => rentalsApi.fulfill(id),
    onSuccess: () => {
      toast({ title: "Rental moved to out for delivery", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["ops-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["ops-summary"] });
    },
    onError: (e: Error) => toast({ title: "Fulfill failed", description: e.message, variant: "error" }),
  });

  const deliveredMut = useMutation({
    mutationFn: (id: number) => rentalsApi.delivered(id),
    onSuccess: () => {
      toast({ title: "Rental marked as delivered", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["ops-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["ops-summary"] });
    },
    onError: (e: Error) => toast({ title: "Delivered failed", description: e.message, variant: "error" }),
  });

  const returnedMut = useMutation({
    mutationFn: (id: number) => rentalsApi.returned(id),
    onSuccess: () => {
      toast({ title: "Rental marked as returned", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["ops-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["ops-summary"] });
    },
    onError: (e: Error) => toast({ title: "Return failed", description: e.message, variant: "error" }),
  });

  const actionableRentals = (rentalsQuery.data ?? []).filter((r: Rental) =>
    ACTIONABLE_STATUSES.includes(r.status)
  );

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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

      {/* Actionable Rentals */}
      {actionableRentals.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Rentals requiring action</h2>
          <div className="space-y-3 mb-8">
            {actionableRentals.map((r: Rental) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                    <p className="text-sm font-medium mt-0.5">
                      {r.startDate} → {r.endDate}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={r.status === "active" ? "success" : "warning"}
                        className="text-xs"
                      >
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {formatSar(r.totalPayableHalalas)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.status === "confirmed" && (
                      <Button
                        size="sm"
                        onClick={() => fulfillMut.mutate(r.id)}
                        disabled={fulfillMut.isPending}
                        className="gap-1"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Fulfill
                      </Button>
                    )}
                    {r.status === "out_for_delivery" && (
                      <Button
                        size="sm"
                        onClick={() => deliveredMut.mutate(r.id)}
                        disabled={deliveredMut.isPending}
                        className="gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark Delivered
                      </Button>
                    )}
                    {(r.status === "active" || r.status === "return_in_transit") && (
                      <Button
                        size="sm"
                        onClick={() => returnedMut.mutate(r.id)}
                        disabled={returnedMut.isPending}
                        className="gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Mark Returned
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

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
