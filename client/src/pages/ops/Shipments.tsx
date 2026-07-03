import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const DIRECTIONS = [
  { value: "owner_to_platform", label: "Owner to platform" },
  { value: "platform_to_renter", label: "Platform to renter" },
  { value: "renter_to_platform", label: "Renter to platform" },
  { value: "platform_to_owner", label: "Platform to owner" },
] as const;

export default function Shipments() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>("in_transit");
  const [editTracking, setEditTracking] = useState("");

  // Schedule shipment form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleAssetId, setScheduleAssetId] = useState("");
  const [scheduleRentalId, setScheduleRentalId] = useState("");
  const [scheduleDirection, setScheduleDirection] = useState<string>("owner_to_platform");
  const [scheduleCourier, setScheduleCourier] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shipments"],
    queryFn: () => operationsApi.shipments(),
  });

  async function handleUpdate(id: number) {
    try {
      setActionError(null);
      await operationsApi.updateShipment(id, {
        status: editStatus,
        trackingNumber: editTracking || undefined,
      });
      setEditingId(null);
      setEditTracking("");
      await qc.invalidateQueries({ queryKey: ["shipments"] });
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduling(true);
    setScheduleError(null);
    setScheduleSuccess(false);
    try {
      const assetId = Number(scheduleAssetId);
      if (!assetId || assetId <= 0) {
        throw new Error("Asset ID is required");
      }
      await operationsApi.scheduleShipment({
        assetId,
        rentalId: scheduleRentalId ? Number(scheduleRentalId) : undefined,
        direction: scheduleDirection,
        courier: scheduleCourier || undefined,
        scheduledAt: scheduleAt || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["shipments"] });
      setScheduleSuccess(true);
      setScheduleAssetId("");
      setScheduleRentalId("");
      setScheduleDirection("owner_to_platform");
      setScheduleCourier("");
      setScheduleAt("");
      setTimeout(() => {
        setScheduleSuccess(false);
        setShowScheduleForm(false);
      }, 1500);
    } catch (err) {
      setScheduleError((err as Error).message ?? "Failed to schedule shipment");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Shipments</h1>
        <Button
          onClick={() => {
            setShowScheduleForm(!showScheduleForm);
            setScheduleError(null);
            setScheduleSuccess(false);
          }}
          className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Shipment
        </Button>
      </div>
      <p className="text-neutral-500 mb-8">
        Outbound deliveries to renters and returns to warehouse.
      </p>

      {showScheduleForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Schedule a new shipment</h2>
            <form onSubmit={handleSchedule}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Asset ID *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={scheduleAssetId}
                    onChange={(e) => setScheduleAssetId(e.target.value)}
                    placeholder="e.g. 42"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Rental ID (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={scheduleRentalId}
                    onChange={(e) => setScheduleRentalId(e.target.value)}
                    placeholder="e.g. 7"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Direction *</Label>
                  <Select value={scheduleDirection} onValueChange={setScheduleDirection}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Courier (optional)</Label>
                  <Input
                    value={scheduleCourier}
                    onChange={(e) => setScheduleCourier(e.target.value)}
                    placeholder="e.g. SMSA, Aramex"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Scheduled at (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {scheduleError && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  {scheduleError}
                </div>
              )}
              {scheduleSuccess && (
                <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  Shipment scheduled successfully.
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <Button
                  type="submit"
                  disabled={scheduling}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {scheduling ? "Scheduling..." : "Schedule"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScheduleForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-4">
          Failed to load data. Please try again.
        </div>
      )}

      {actionError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-4 mb-4">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No shipments yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s: Shipment) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500">
                      Shipment #{s.id} · Asset #{s.assetId}
                      {s.rentalId ? ` · Rental #${s.rentalId}` : ""}
                    </p>
                    <p className="font-semibold">
                      {s.direction.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      <span>{s.courier ?? "—"}</span>
                      {s.trackingNumber && <span>· {s.trackingNumber}</span>}
                    </div>
                  </div>
                  <Badge
                    className={
                      s.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : s.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {s.status.replace(/_/g, " ")}
                  </Badge>
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
                </div>

                {editingId === s.id && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
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
