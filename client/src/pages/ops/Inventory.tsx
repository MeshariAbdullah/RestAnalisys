import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageSearch, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operationsApi, assetsApi } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "listed") return "bg-green-100 text-green-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s.startsWith("pending") || s.includes("inspection"))
    return "bg-amber-100 text-amber-800";
  if (s === "awaiting_shipment") return "bg-purple-100 text-purple-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-8">
        All assets tracked by the MLR warehouse.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <PackageSearch className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No inventory items.
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
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <InventoryRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InventoryRow({
  item,
}: {
  item: { id: number; title: string; brand: string; status: string };
}) {
  const qc = useQueryClient();
  const [showReceive, setShowReceive] = useState(false);
  const [locationCode, setLocationCode] = useState("");

  const receiveMut = useMutation({
    mutationFn: () => assetsApi.received(item.id, locationCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setShowReceive(false);
      setLocationCode("");
    },
  });

  const canReceive = item.status === "awaiting_shipment";

  return (
    <tr className="border-b last:border-0">
      <td className="p-4 font-mono text-xs">#{item.id}</td>
      <td className="p-4">{item.brand}</td>
      <td className="p-4">{item.title}</td>
      <td className="p-4">
        <Badge className={`border-0 ${statusColor(item.status)}`}>
          {item.status.replace(/_/g, " ")}
        </Badge>
      </td>
      <td className="p-4">
        {canReceive && !showReceive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReceive(true)}
          >
            <MapPin className="w-3 h-3 mr-1" />
            Mark received
          </Button>
        )}
        {showReceive && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Location code"
              className="w-[140px]"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!locationCode || receiveMut.isPending}
              onClick={() => receiveMut.mutate()}
            >
              {receiveMut.isPending ? "…" : "Confirm"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowReceive(false);
                setLocationCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        {receiveMut.isError && (
          <p className="text-red-600 text-xs mt-1">
            {(receiveMut.error as Error).message}
          </p>
        )}
      </td>
    </tr>
  );
}
