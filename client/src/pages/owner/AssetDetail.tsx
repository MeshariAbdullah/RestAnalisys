import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Diamond, CheckCircle2, X as XIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar } from "@/lib/api";
import { toast } from "@/hooks/useToast";

function statusBadgeClass(s: string): string {
  if (s === "listed") return "bg-emerald-100 text-emerald-700 border-0";
  if (s === "rented_out") return "bg-blue-100 text-blue-700 border-0";
  if (s === "awaiting_owner_approval") return "bg-amber-100 text-amber-800 border-0";
  if (s.startsWith("pending")) return "bg-yellow-100 text-yellow-800 border-0";
  if (s === "rejected") return "bg-red-100 text-red-700 border-0";
  if (s === "withdrawn") return "bg-neutral-200 text-neutral-600 border-0";
  return "bg-neutral-900 text-white border-0";
}

export default function AssetDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => assetsApi.get(id),
  });

  async function respondValuation(approved: boolean) {
    setActionError(null);
    try {
      await assetsApi.valuationResponse(
        id,
        approved,
        approved ? undefined : "Owner rejected the proposed valuation"
      );
      await qc.invalidateQueries({ queryKey: ["asset", id] });
      toast({
        title: approved ? "Valuation approved" : "Valuation rejected",
        description: approved
          ? "Your asset will now be listed for rental."
          : "The proposed valuation has been declined.",
        variant: approved ? "success" : "default",
      });
    } catch (err) {
      setActionError((err as Error).message);
      toast({
        title: "Action failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  async function withdraw() {
    if (!confirm("Withdraw this asset? It will no longer be rentable.")) return;
    setActionError(null);
    try {
      await assetsApi.withdraw(id);
      await qc.invalidateQueries({ queryKey: ["asset", id] });
      toast({
        title: "Asset withdrawn",
        description: "This asset has been removed from active listings.",
        variant: "default",
      });
    } catch (err) {
      setActionError((err as Error).message);
      toast({
        title: "Withdrawal failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  if (isLoading || !asset) return <div className="p-8">Loading…</div>;

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
        <Badge className={statusBadgeClass(asset.status)}>
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
              onClick={withdraw}
            >
              Withdraw from listing
            </Button>
          )}

          {actionError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {actionError}
            </div>
          )}
        </div>
      </div>
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
