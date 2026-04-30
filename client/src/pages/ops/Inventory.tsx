import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, History, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { operationsApi } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "listed") return "bg-green-100 text-green-700";
  if (s === "rented_out") return "bg-blue-100 text-blue-700";
  if (s.startsWith("pending") || s.includes("inspection"))
    return "bg-amber-100 text-amber-800";
  return "bg-neutral-200 text-neutral-700";
}

export default function Inventory() {
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => operationsApi.inventory(),
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["inventory-movements", selectedAssetId],
    queryFn: () => operationsApi.inventoryMovements(selectedAssetId!),
    enabled: selectedAssetId !== null,
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-neutral-500 mb-8">
        All assets tracked by the MLR warehouse. Click the history icon to view movement logs.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <PackageSearch className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No inventory items.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Brand</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-4 font-mono text-xs">#{item.id}</td>
                    <td className="p-4">{item.brand}</td>
                    <td className="p-4">{item.title}</td>
                    <td className="p-4">
                      <Badge className={`border-0 ${statusColor(item.status)}`}>
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAssetId(item.id)}
                      >
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedAssetId !== null} onOpenChange={(open) => { if (!open) setSelectedAssetId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Movement history — Asset #{selectedAssetId}</DialogTitle>
            <DialogDescription>
              All tracked location changes for this asset.
            </DialogDescription>
          </DialogHeader>
          {movementsLoading ? (
            <p className="text-neutral-500 py-4">Loading movements...</p>
          ) : !movements || movements.length === 0 ? (
            <p className="text-neutral-500 py-4 text-center">No movement records found.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">From</th>
                    <th className="text-left p-3 font-medium">To</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{m.fromLocation ?? "—"}</td>
                      <td className="p-3 font-mono text-xs">{m.toLocation}</td>
                      <td className="p-3">{m.reason}</td>
                      <td className="p-3 text-neutral-500 text-xs">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
