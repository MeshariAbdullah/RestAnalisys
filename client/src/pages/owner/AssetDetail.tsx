import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Diamond,
  CheckCircle2,
  X as XIcon,
  AlertTriangle,
  Clock,
  FileText,
  TrendingUp,
  Package,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assetsApi, inspectionsApi, formatSar } from "@/lib/api";

const statusColors: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  awaiting_shipment: "bg-blue-100 text-blue-800",
  in_inspection: "bg-purple-100 text-purple-800",
  inspection_reported: "bg-indigo-100 text-indigo-800",
  awaiting_owner_approval: "bg-amber-100 text-amber-800",
  owner_rejected_valuation: "bg-red-100 text-red-800",
  ready_for_listing: "bg-teal-100 text-teal-800",
  listed: "bg-green-100 text-green-800",
  reserved: "bg-blue-200 text-blue-900",
  rented_out: "bg-emerald-100 text-emerald-800",
  returned_under_inspection: "bg-orange-100 text-orange-800",
  completed: "bg-gray-100 text-gray-800",
  withdrawn: "bg-gray-200 text-gray-600",
  lost_or_destroyed: "bg-red-200 text-red-900",
};

const gradeColors: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-red-100 text-red-800",
};

export default function AssetDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => assetsApi.get(id),
  });

  const { data: inspectionHistory } = useQuery({
    queryKey: ["inspections", "asset", id],
    queryFn: () => inspectionsApi.forAsset(id),
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

  if (isLoading || !asset) return <div className="p-8">Loading...</div>;

  const images = [
    ...(asset.studioImagesJson ?? []),
    ...(asset.submissionImagesJson ?? []),
  ];
  const awaitingOwner = asset.status === "awaiting_owner_approval";
  const statusClass = statusColors[asset.status] ?? "bg-neutral-100 text-neutral-700";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            {asset.brand}
          </p>
          <h1 className="text-3xl font-bold">{asset.title}</h1>
          {asset.model && <p className="text-neutral-500">{asset.model}</p>}
        </div>
        <Badge className={statusClass}>
          {asset.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                <Row label="Warehouse" value={asset.warehouseLocationCode} />
              )}
              <Row
                label="Submitted"
                value={new Date(asset.createdAt).toLocaleDateString("en-SA")}
              />
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details" className="gap-1">
            <FileText className="w-4 h-4" /> Details
          </TabsTrigger>
          <TabsTrigger value="inspections" className="gap-1">
            <Eye className="w-4 h-4" /> Inspections
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1">
            <Clock className="w-4 h-4" /> Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
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

            {asset.attributesJson &&
              Object.keys(asset.attributesJson).length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm font-semibold mb-2">Attributes</p>
                    <div className="space-y-2 text-sm">
                      {Object.entries(asset.attributesJson).map(
                        ([key, val]) => (
                          <Row
                            key={key}
                            label={key.replace(/_/g, " ")}
                            value={String(val)}
                          />
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Financial Summary
                </p>
                <div className="space-y-2 text-sm">
                  <Row
                    label="Owner declared"
                    value={formatSar(asset.ownerDeclaredValueHalalas)}
                  />
                  <Row
                    label="Platform evaluated"
                    value={formatSar(asset.evaluatedValueHalalas)}
                  />
                  <Row
                    label="Daily rental price"
                    value={formatSar(asset.dailyRentalPriceHalalas)}
                  />
                  {asset.evaluatedValueHalalas && asset.dailyRentalPriceHalalas && (
                    <Row
                      label="Est. monthly revenue"
                      value={formatSar(
                        (asset.dailyRentalPriceHalalas ?? 0) * 30 * 0.8
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="mt-4">
          {!inspectionHistory || inspectionHistory.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-neutral-500">
                <Eye className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <p>No inspections recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inspectionHistory.map((insp) => (
                <Card key={insp.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            insp.type === "intake"
                              ? "border-blue-300 text-blue-700"
                              : "border-orange-300 text-orange-700"
                          }
                        >
                          {insp.type}
                        </Badge>
                        {insp.conditionGrade && (
                          <Badge
                            className={
                              gradeColors[insp.conditionGrade] ??
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            Grade {insp.conditionGrade}
                          </Badge>
                        )}
                        {insp.authenticityVerified && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Authentic
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">
                        Score: {insp.conditionScore ?? "—"}/100
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <Row
                        label="Market value"
                        value={formatSar(insp.marketValueHalalas)}
                      />
                      <Row
                        label="Rec. daily price"
                        value={formatSar(insp.recommendedDailyPriceHalalas)}
                      />
                      <Row label="Risk" value={insp.riskCategory} />
                    </div>

                    {(insp.beforeImagesJson?.length > 0 ||
                      insp.afterImagesJson?.length > 0) && (
                      <div className="mt-4 grid grid-cols-6 gap-2">
                        {[...insp.beforeImagesJson, ...insp.afterImagesJson]
                          .slice(0, 6)
                          .map((src, i) => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="relative pl-6 space-y-6">
                <TimelineItem
                  label="Submitted"
                  date={asset.createdAt}
                  active
                />
                {asset.status !== "pending_approval" && (
                  <TimelineItem
                    label={
                      asset.status === "rejected"
                        ? "Rejected"
                        : "Approved by admin"
                    }
                    date={asset.updatedAt}
                    active={asset.status !== "rejected"}
                    error={asset.status === "rejected"}
                    detail={asset.rejectionReason}
                  />
                )}
                {inspectionHistory && inspectionHistory.length > 0 && (
                  <TimelineItem
                    label="Inspection complete"
                    date={asset.updatedAt}
                    active
                    detail={`Grade: ${inspectionHistory[0]?.conditionGrade ?? "—"}`}
                  />
                )}
                {(asset.status === "listed" ||
                  asset.status === "reserved" ||
                  asset.status === "rented_out") && (
                  <TimelineItem label="Listed" date={asset.updatedAt} active />
                )}
                {asset.status === "rented_out" && (
                  <TimelineItem
                    label="Currently rented"
                    date={asset.updatedAt}
                    active
                  />
                )}
                {asset.status === "withdrawn" && (
                  <TimelineItem
                    label="Withdrawn"
                    date={asset.withdrawnAt ?? asset.updatedAt}
                    active
                  />
                )}
                {asset.status === "lost_or_destroyed" && (
                  <TimelineItem
                    label="Lost or destroyed"
                    date={asset.updatedAt}
                    error
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "---"}</span>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  active,
  error,
  detail,
}: {
  label: string;
  date?: string | null;
  active?: boolean;
  error?: boolean;
  detail?: string | null;
}) {
  const dotColor = error
    ? "bg-red-500"
    : active
    ? "bg-green-500"
    : "bg-neutral-300";

  return (
    <div className="relative">
      <div
        className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${dotColor}`}
      />
      <div className="absolute -left-[17px] top-4 w-px h-full bg-neutral-200" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        {date && (
          <p className="text-xs text-neutral-500">
            {new Date(date).toLocaleDateString("en-SA", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        {detail && (
          <p className="text-xs text-neutral-600 mt-1">{detail}</p>
        )}
      </div>
    </div>
  );
}
