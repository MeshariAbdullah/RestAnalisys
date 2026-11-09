import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  AlertTriangle,
  PackageSearch,
  Activity,
  Play,
  CheckCircle,
  RotateCcw,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { operationsApi, rentalsApi, formatSar, type Rental } from "@/lib/api";

export default function OpsDashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ops-summary"],
    queryFn: () => operationsApi.summary(),
  });

  const { data: allRentals, isLoading: rentalsLoading } = useQuery({
    queryKey: ["rentals-all"],
    queryFn: () => rentalsApi.list(),
  });

  const fulfillMut = useMutation({
    mutationFn: (id: number) => rentalsApi.fulfill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals-all"] });
      qc.invalidateQueries({ queryKey: ["ops-summary"] });
    },
  });

  const deliveredMut = useMutation({
    mutationFn: (id: number) => rentalsApi.delivered(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals-all"] });
      qc.invalidateQueries({ queryKey: ["ops-summary"] });
    },
  });

  const returnedMut = useMutation({
    mutationFn: (id: number) => rentalsApi.returned(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals-all"] });
      qc.invalidateQueries({ queryKey: ["ops-summary"] });
    },
  });

  const confirmed = (allRentals ?? []).filter((r) => r.status === "confirmed");
  const outForDelivery = (allRentals ?? []).filter(
    (r) => r.status === "out_for_delivery"
  );
  const activeOrReturn = (allRentals ?? []).filter(
    (r) => r.status === "active" || r.status === "return_in_transit"
  );
  const underInspection = (allRentals ?? []).filter(
    (r) => r.status === "under_inspection"
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

      {/* Rental lifecycle actions */}
      {rentalsLoading ? (
        <p className="text-neutral-500 mb-8">Loading rentals…</p>
      ) : (
        <div className="space-y-6 mb-8">
          <RentalActionSection
            title="Ready to Fulfill"
            icon={<Play className="w-4 h-4" />}
            rentals={confirmed}
            actionLabel="Fulfill"
            actionColor="bg-blue-600 hover:bg-blue-700 text-white"
            onAction={(id) => fulfillMut.mutate(id)}
            isLoading={fulfillMut.isPending}
          />
          <RentalActionSection
            title="Out for Delivery"
            icon={<Truck className="w-4 h-4" />}
            rentals={outForDelivery}
            actionLabel="Mark Delivered"
            actionColor="bg-green-600 hover:bg-green-700 text-white"
            onAction={(id) => deliveredMut.mutate(id)}
            isLoading={deliveredMut.isPending}
          />
          <RentalActionSection
            title="Active — Awaiting Return"
            icon={<RotateCcw className="w-4 h-4" />}
            rentals={activeOrReturn}
            actionLabel="Mark Returned"
            actionColor="bg-amber-600 hover:bg-amber-700 text-white"
            onAction={(id) => returnedMut.mutate(id)}
            isLoading={returnedMut.isPending}
          />
          {underInspection.length > 0 && (
            <div>
              <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Under Inspection — Close Rental
              </h3>
              <div className="space-y-3">
                {underInspection.map((r) => (
                  <CloseRentalCard key={r.id} rental={r} />
                ))}
              </div>
            </div>
          )}
        </div>
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

function RentalActionSection({
  title,
  icon,
  rentals,
  actionLabel,
  actionColor,
  onAction,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  rentals: Rental[];
  actionLabel: string;
  actionColor: string;
  onAction: (id: number) => void;
  isLoading: boolean;
}) {
  if (rentals.length === 0) return null;
  return (
    <div>
      <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
        {icon} {title}
        <Badge variant="secondary" className="ml-1">
          {rentals.length}
        </Badge>
      </h3>
      <div className="space-y-2">
        {rentals.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-neutral-500">
                  {r.reference}
                </p>
                <p className="text-sm">
                  {r.startDate} → {r.endDate} ({r.durationDays}d)
                </p>
                <p className="text-xs text-neutral-500">
                  {formatSar(r.totalPayableHalalas)}
                </p>
              </div>
              <Button
                size="sm"
                className={actionColor}
                disabled={isLoading}
                onClick={() => onAction(r.id)}
              >
                {actionLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CloseRentalCard({ rental }: { rental: Rental }) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState<string>("");
  const [penaltySar, setPenaltySar] = useState("");

  const closeMut = useMutation({
    mutationFn: () => {
      const o = outcome as "clean" | "penalty" | "major_damage" | "loss";
      const penaltyHalalas =
        o === "penalty" && penaltySar
          ? Math.round(parseFloat(penaltySar) * 100)
          : undefined;
      return rentalsApi.close(rental.id, o, penaltyHalalas);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals-all"] });
      qc.invalidateQueries({ queryKey: ["ops-summary"] });
      setOutcome("");
      setPenaltySar("");
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-neutral-500">
              {rental.reference}
            </p>
            <p className="text-sm">
              {rental.startDate} → {rental.endDate} ({rental.durationDays}d)
            </p>
            <p className="text-xs text-neutral-500">
              {formatSar(rental.totalPayableHalalas)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Outcome…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="major_damage">Major damage</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
              </SelectContent>
            </Select>
            {outcome === "penalty" && (
              <Input
                type="number"
                placeholder="Penalty SAR"
                className="w-[120px]"
                value={penaltySar}
                onChange={(e) => setPenaltySar(e.target.value)}
              />
            )}
            <Button
              size="sm"
              disabled={!outcome || closeMut.isPending}
              onClick={() => closeMut.mutate()}
            >
              Close rental
            </Button>
          </div>
        </div>
        {closeMut.isError && (
          <p className="text-red-600 text-xs mt-2">
            {(closeMut.error as Error).message}
          </p>
        )}
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
