import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X as XIcon, Diamond } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, type Asset } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function AssetApprovals() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assets-pending"],
    queryFn: () => assetsApi.pending(),
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
      toast({ title: approved ? "Asset approved" : "Asset rejected", variant: "success" });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast({ title: "Action failed", description: msg, variant: "destructive" });
    }
  }

  async function publish(id: number) {
    setError(null);
    try {
      await assetsApi.publish(id);
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
      toast({ title: "Listing published", description: "Asset is now visible to renters.", variant: "success" });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast({ title: "Publish failed", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Asset approvals</h1>
      <p className="text-neutral-500 mb-8">
        Moderate newly submitted assets and publish ready listings.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-5 flex items-center gap-4">
              <div className="w-20 h-20 bg-neutral-200 rounded-md animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-neutral-200 rounded animate-pulse" />
                <div className="h-5 w-48 bg-neutral-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-neutral-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-neutral-200 rounded animate-pulse" />
                <div className="h-9 w-20 bg-neutral-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Diamond className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="font-medium text-neutral-600">No assets awaiting approval</p>
            <p className="text-sm mt-1">Submissions from owners will appear here for review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((asset: Asset) => (
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
                    <Badge variant="outline">
                      {asset.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      Declared {formatSar(asset.ownerDeclaredValueHalalas)}
                    </span>
                    {asset.evaluatedValueHalalas && (
                      <span className="text-xs text-neutral-500">
                        Eval {formatSar(asset.evaluatedValueHalalas)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {asset.status === "pending_approval" && (
                    <>
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
                    </>
                  )}
                  {asset.status === "ready_for_listing" ? (
                    <Button
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      onClick={() => publish(asset.id)}
                    >
                      Publish listing
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
