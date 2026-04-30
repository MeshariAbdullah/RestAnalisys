import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X as XIcon, Diamond } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assetsApi, formatSar, type Asset } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function AssetApprovals() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<Asset | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["assets-pending"],
    queryFn: () => assetsApi.pending(),
  });

  async function approve(id: number) {
    try {
      await assetsApi.review(id, true);
      toast({ title: "Asset approved", variant: "success" });
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  }

  async function confirmReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await assetsApi.review(rejectTarget.id, false, rejectReason);
      toast({ title: "Asset rejected", variant: "destructive" });
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setRejectTarget(null);
  }

  async function publish(id: number) {
    try {
      await assetsApi.publish(id);
      toast({ title: "Asset published to catalog", variant: "success" });
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Asset approvals</h1>
      <p className="text-neutral-500 mb-8">
        Moderate newly submitted assets and publish ready listings.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No assets awaiting approval.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((asset: Asset) => (
            <Card key={asset.id}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-20 h-20 bg-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                  {asset.submissionImagesJson?.[0] ? (
                    <img src={asset.submissionImagesJson[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Diamond className="w-10 h-10 text-neutral-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase text-neutral-500">{asset.brand}</p>
                  <p className="font-semibold">{asset.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{asset.status.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-neutral-500">Declared {formatSar(asset.ownerDeclaredValueHalalas)}</span>
                    {asset.evaluatedValueHalalas && (
                      <span className="text-xs text-neutral-500">Eval {formatSar(asset.evaluatedValueHalalas)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {asset.status === "pending_approval" && (
                    <>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => approve(asset.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" onClick={() => { setRejectTarget(asset); setRejectReason(""); }}>
                        <XIcon className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {(asset.status === "in_inspection" || asset.status === "in_vault") && (
                    <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400" onClick={() => publish(asset.id)}>
                      Publish listing
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject asset</DialogTitle>
            <DialogDescription>
              Reject <strong>{rejectTarget?.brand} — {rejectTarget?.title}</strong>. The owner will see the reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Rejection reason</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Images not clear enough, suspected counterfeit..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button onClick={confirmReject} disabled={!rejectReason.trim()} className="bg-red-600 text-white hover:bg-red-500">
              Reject asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
