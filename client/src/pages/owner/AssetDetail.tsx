import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Diamond,
  CheckCircle2,
  X as XIcon,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Package,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, inspectionsApi, formatSar } from "@/lib/api";

function statusColor(s: string): string {
  if (["listed", "rented_out", "completed"].includes(s))
    return "bg-green-100 text-green-700";
  if (s.startsWith("pending") || s.includes("inspection") || s.includes("awaiting"))
    return "bg-amber-100 text-amber-800";
  if (["rejected", "withdrawn", "lost_or_destroyed"].includes(s))
    return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

function rentalStatusColor(s: string): string {
  if (["closed"].includes(s)) return "bg-green-100 text-green-700";
  if (["active", "confirmed", "out_for_delivery"].includes(s))
    return "bg-blue-100 text-blue-700";
  if (["cancelled"].includes(s)) return "bg-neutral-200 text-neutral-600";
  if (s.includes("penalty") || s.includes("dispute") || s.includes("enforcement"))
    return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

export default function AssetDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => assetsApi.get(id),
  });

  const { data: assetRentals } = useQuery({
    queryKey: ["asset-rentals", id],
    queryFn: () => assetsApi.rentals(id),
    enabled: !!asset,
  });

  const { data: assetInspections } = useQuery({
    queryKey: ["asset-inspections", id],
    queryFn: () => inspectionsApi.forAsset(id),
    enabled: !!asset,
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
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function withdraw() {
    if (!confirm("Withdraw this asset? It will no longer be rentable.")) return;
    setActionError(null);
    try {
      await assetsApi.withdraw(id);
      await qc.invalidateQueries({ queryKey: ["asset", id] });
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  if (isLoading || !asset) return <div className="p-8">Loading…</div>;

  const images = [
    ...(asset.studioImagesJson ?? []),
    ...(asset.submissionImagesJson ?? []),
  ];
  const awaitingOwner = asset.status === "inspection_reported";
  const rentals = assetRentals ?? [];
  const inspections = assetInspections ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/owner">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </a>
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            {asset.brand}
          </p>
          <h1 className="text-3xl font-bold">{asset.title}</h1>
          {asset.model && <p className="text-neutral-500">{asset.model}</p>}
        </div>
        <Badge className={`${statusColor(asset.status)} border-0 text-sm px-3 py-1.5`}>
          {asset.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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
            <div className="grid grid-cols-5 gap-2">
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
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold mb-2">Description</p>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {asset.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rental history */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neutral-400" />
                Rental History
              </h2>
              {rentals.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  No rentals yet for this asset.
                </p>
              ) : (
                <div className="space-y-3">
                  {rentals.map((r) => (
                    <div
                      key={r.id}
                      className="border rounded-lg p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-neutral-500">
                            {r.reference}
                          </span>
                          <Badge
                            className={`${rentalStatusColor(r.status)} border-0 text-xs`}
                          >
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm">
                          {r.startDate} → {r.endDate}{" "}
                          <span className="text-neutral-500">
                            ({r.durationDays} days)
                          </span>
                        </p>
                        {r.renterName && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Renter: {r.renterName}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-amber-600">
                          {formatSar(r.rentalSubtotalHalalas)}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {formatSar(r.dailyPriceHalalas)}/day
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inspection history */}
          {inspections.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-neutral-400" />
                  Inspection Reports
                </h2>
                <div className="space-y-3">
                  {inspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-neutral-100 text-neutral-700 border-0 text-xs capitalize">
                            {insp.type}
                          </Badge>
                          <Badge
                            className={`border-0 text-xs ${
                              insp.authenticityVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {insp.authenticityVerified ? "Authentic" : "Unverified"}
                          </Badge>
                        </div>
                        {insp.conditionGrade && (
                          <span className="font-bold text-lg">
                            {insp.conditionGrade}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-neutral-500">Condition</p>
                          <p className="font-medium">{insp.conditionScore ?? "—"}/100</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Market Value</p>
                          <p className="font-medium">
                            {formatSar(insp.marketValueHalalas)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Rec. Daily</p>
                          <p className="font-medium">
                            {formatSar(insp.recommendedDailyPriceHalalas)}
                          </p>
                        </div>
                      </div>
                      {insp.ownerApproved && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Owner approved
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
              <div className="border-t pt-3 mt-3">
                <Row label="Total rentals" value={rentals.length} />
                <div className="mt-1">
                  <Row
                    label="Total earnings"
                    value={formatSar(
                      rentals
                        .filter((r) => ["closed", "closed_with_penalty"].includes(r.status))
                        .reduce((sum, r) => sum + r.rentalSubtotalHalalas, 0)
                    )}
                  />
                </div>
              </div>
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

          {asset.rejectionReason && (
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-600">{asset.rejectionReason}</p>
              </CardContent>
            </Card>
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
