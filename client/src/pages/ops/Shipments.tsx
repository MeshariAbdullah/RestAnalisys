import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
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
  "returned_to_warehouse",
] as const;

export default function Shipments() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>("in_transit");
  const [editTracking, setEditTracking] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: () => operationsApi.shipments(),
  });

  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(id: number) {
    setError(null);
    try {
      await operationsApi.updateShipment(id, {
        status: editStatus,
        trackingNumber: editTracking || undefined,
      });
      setEditingId(null);
      setEditTracking("");
      await qc.invalidateQueries({ queryKey: ["shipments"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Shipments</h1>
      <p className="text-neutral-500 mb-8">
        Outbound deliveries to renters and returns to warehouse.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
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
