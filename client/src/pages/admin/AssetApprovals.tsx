import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  X as XIcon,
  Diamond,
  Upload,
  Clock,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, type Asset } from "@/lib/api";

export default function AssetApprovals() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "publish">("pending");

  const pendingQuery = useQuery({
    queryKey: ["assets-pending"],
    queryFn: () => assetsApi.pending(),
  });

  const readyQuery = useQuery({
    queryKey: ["assets-ready-to-publish"],
    queryFn: () => assetsApi.readyToPublish(),
  });

  async function act(id: number, approved: boolean) {
    setError(null);
    try {
      const reason = approved
        ? undefined
        : prompt("Rejection reason?") ?? undefined;
      if (!approved && !reason) return;
      await assetsApi.review(id, approved, reason);
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function publish(id: number) {
    setError(null);
    try {
      await assetsApi.publish(id);
      await qc.invalidateQueries({ queryKey: ["assets-ready-to-publish"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const pendingCount = pendingQuery.data?.length ?? 0;
  const readyCount = readyQuery.data?.length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Asset approvals</h1>
      <p className="text-neutral-500 mb-6">
        Moderate newly submitted assets and publish ready listings.
      </p>

      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "pending" ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Review
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("publish")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "publish" ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Upload className="w-4 h-4" />
          Ready to Publish
          {readyCount > 0 && (
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {readyCount}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {tab === "pending" && (
        <>
          {pendingQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : pendingCount === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                No assets awaiting review.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingQuery.data!.map((asset: Asset) => (
                <Card key={asset.id}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                      {asset.submissionImagesJson?.[0] ? (
                        <img
                          src={asset.submissionImagesJson[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Diamond className="w-10 h-10 text-neutral-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase text-neutral-500">
                        {asset.brand}
                      </p>
                      <p className="font-semibold">{asset.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{asset.category}</Badge>
                        <span className="text-xs text-neutral-500">
                          Declared {formatSar(asset.ownerDeclaredValueHalalas)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => act(asset.id, true)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => act(asset.id, false)}
                      >
                        <XIcon className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "publish" && (
        <>
          {readyQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : readyCount === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">
                <Eye className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                No assets ready to publish.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {readyQuery.data!.map((asset: Asset) => (
                <Card key={asset.id} className="border-green-200">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                      {(asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0]) ? (
                        <img
                          src={asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Diamond className="w-10 h-10 text-neutral-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase text-neutral-500">
                        {asset.brand}
                      </p>
                      <p className="font-semibold">{asset.title}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline">{asset.category}</Badge>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          {asset.riskCategory} risk
                        </Badge>
                        <span className="text-xs text-neutral-500">
                          Value {formatSar(asset.evaluatedValueHalalas)}
                        </span>
                        <span className="text-xs text-amber-600 font-medium">
                          {formatSar(asset.dailyRentalPriceHalalas)}/day
                        </span>
                      </div>
                    </div>
                    <Button
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400 shrink-0"
                      onClick={() => publish(asset.id)}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Publish
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
