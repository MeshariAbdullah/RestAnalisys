import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Diamond, CheckCircle2, X as XIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { assetsApi, formatSar } from "@/lib/api";

export default function AssetDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => assetsApi.get(id),
  });

  async function respondValuation(approved: boolean) {
    try {
      await assetsApi.valuationResponse(
        id,
        approved,
        approved ? undefined : "Owner rejected the proposed valuation"
      );
      await qc.invalidateQueries({ queryKey: ["asset", id] });
      toast({
        description: approved ? "Valuation approved" : "Valuation rejected",
        variant: approved ? "success" : "default",
      });
    } catch (err) {
      toast({ description: (err as Error).message, variant: "destructive" });
    }
  }

  async function confirmWithdraw() {
    try {
      await assetsApi.withdraw(id);
      await qc.invalidateQueries({ queryKey: ["asset", id] });
      toast({ description: "Asset withdrawn from listing", variant: "success" });
      setShowWithdraw(false);
    } catch (err) {
      toast({ description: (err as Error).message, variant: "destructive" });
    }
  }

  if (isLoading || !asset) return <div className="p-8">Loading...</div>;

  const images = [
    ...(asset.studioImagesJson ?? []),
    ...(asset.submissionImagesJson ?? []),
  ];
  const awaitingOwner = asset.status === "awaiting_owner_approval";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            {asset.brand}
          </p>
          <h1 className="text-3xl font-bold">{asset.title}</h1>
          {asset.model && <p className="text-neutral-500">{asset.model}</p>}
        </div>
        <Badge className="bg-neutral-900 text-white">
          {asset.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="aspect-video bg-neutral-100 rounded-xl overflow-hidden flex items-center justify-center">
            {images[0] ? (
              <img
                src={images[0]}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Diamond className="w-20 h-20 text-neutral-300" />
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {images.slice(1, 6).map((src, i) => (
                <div
                  key={i}
                  className="aspect-square bg-neutral-100 rounded overflow-hidden"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {asset.description && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <p className="text-sm font-semibold mb-2">Description</p>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {asset.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3 text-sm">
              <Row label="Category" value={asset.category} />
              <Row
                label="Declared value"
                value={formatSar(asset.ownerDeclaredValueHalalas)}
              />
              <Row
                label="Evaluated value"
                value={formatSar(asset.evaluatedValueHalalas)}
              />
              <Row
                label="Daily rental"
                value={formatSar(asset.dailyRentalPriceHalalas)}
              />
              <Row label="Risk category" value={asset.riskCategory} />
              {asset.warehouseLocationCode && (
                <Row
                  label="Warehouse"
                  value={asset.warehouseLocationCode}
                />
              )}
            </CardContent>
          </Card>

          {awaitingOwner && (
            <Card className="border-amber-300 bg-amber-50/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <p className="font-semibold text-amber-900">
                    Valuation proposed
                  </p>
                </div>
                <p className="text-sm text-amber-900 mb-4">
                  MLR has proposed an evaluated value of{" "}
                  <b>{formatSar(asset.evaluatedValueHalalas)}</b> and a daily
                  rental of{" "}
                  <b>{formatSar(asset.dailyRentalPriceHalalas)}</b>. Approve to
                  list the asset.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    onClick={() => respondValuation(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => respondValuation(false)}
                  >
                    <XIcon className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {asset.status === "listed" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowWithdraw(true)}
            >
              Withdraw from listing
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw asset</DialogTitle>
            <DialogDescription>
              This will remove "{asset.title}" from listings. It will no longer be rentable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)}>
              Keep Listed
            </Button>
            <Button variant="destructive" onClick={confirmWithdraw}>
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
