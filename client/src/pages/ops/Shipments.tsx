import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Package,
  ArrowRight,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { operationsApi, type Shipment } from "@/lib/api";

const STATUSES = [
  "scheduled",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned",
] as const;

function statusColor(s: string): string {
  if (s === "delivered") return "bg-green-100 text-green-700";
  if (s === "failed" || s === "returned") return "bg-red-100 text-red-700";
  if (s === "in_transit" || s === "picked_up") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-800";
}

function directionLabel(d: string): string {
  return {
    owner_to_platform: "Owner → Platform",
    platform_to_renter: "Platform → Renter",
    renter_to_platform: "Renter → Platform",
    platform_to_owner: "Platform → Owner",
  }[d] ?? d.replace(/_/g, " ");
}

function DirectionIcon({ direction }: { direction: string }) {
  const isInbound = direction.endsWith("_to_platform");
  return isInbound ? (
    <ArrowLeft className="w-4 h-4 text-blue-500" />
  ) : (
    <ArrowRight className="w-4 h-4 text-amber-500" />
  );
}

export default function Shipments() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>("in_transit");
  const [editTracking, setEditTracking] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: () => operationsApi.shipments(),
  });

  const filtered = (data ?? []).filter((s) => {
    if (directionFilter !== "all" && s.direction !== directionFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const activeCount = (data ?? []).filter(
    (s) => !["delivered", "failed", "returned"].includes(s.status)
  ).length;

  async function handleUpdate(id: number) {
    await operationsApi.updateShipment(id, {
      status: editStatus,
      trackingNumber: editTracking || undefined,
    });
    setEditingId(null);
    setEditTracking("");
    await qc.invalidateQueries({ queryKey: ["shipments"] });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Shipments</h1>
          <p className="text-neutral-500">
            {activeCount > 0 ? (
              <>
                <span className="font-medium text-neutral-700">{activeCount}</span>{" "}
                active shipments
              </>
            ) : (
              "No active shipments"
            )}
            {data && ` · ${data.length} total`}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="owner_to_platform">Owner → Platform</SelectItem>
            <SelectItem value="platform_to_renter">Platform → Renter</SelectItem>
            <SelectItem value="renter_to_platform">Renter → Platform</SelectItem>
            <SelectItem value="platform_to_owner">Platform → Owner</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-neutral-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {data && data.length > 0
              ? "No shipments match your filters."
              : "No shipments yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s: Shipment) => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <DirectionIcon direction={s.direction} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {directionLabel(s.direction)}
                      </p>
                      <span className="text-xs text-neutral-400">
                        #{s.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Asset #{s.assetId}
                      </span>
                      {s.rentalId && <span>Rental #{s.rentalId}</span>}
                      {s.courier && <span>· {s.courier}</span>}
                      {s.trackingNumber && (
                        <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
                          {s.trackingNumber}
                        </span>
                      )}
                    </div>
                    {s.scheduledAt && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Scheduled: {new Date(s.scheduledAt).toLocaleDateString("en-SA")}
                        {s.deliveredAt &&
                          ` · Delivered: ${new Date(s.deliveredAt).toLocaleDateString("en-SA")}`}
                      </p>
                    )}
                  </div>
                  <Badge className={`border-0 ${statusColor(s.status)}`}>
                    {s.status.replace(/_/g, " ")}
                  </Badge>
                  {!["delivered", "failed"].includes(s.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(editingId === s.id ? null : s.id);
                        setEditStatus(s.status);
                        setEditTracking(s.trackingNumber ?? "");
                      }}
                    >
                      Update
                    </Button>
                  )}
                </div>

                {editingId === s.id && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Tracking number"
                      value={editTracking}
                      onChange={(e) => setEditTracking(e.target.value)}
                    />
                    <Button
                      onClick={() => handleUpdate(s.id)}
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
