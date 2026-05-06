import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X as XIcon, Diamond } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
      toast({ title: "Asset approved", description: "The asset has been approved and sent for inspection.", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function confirmReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await assetsApi.review(rejectTarget.id, false, rejectReason);
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
      toast({ title: "Asset rejected", description: `${rejectTarget.title} has been rejected.`, variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRejectTarget(null);
      setRejectReason("");
    }
  }

  async function publish(id: number) {
    try {
      await assetsApi.publish(id);
      await qc.invalidateQueries({ queryKey: ["assets-pending"] });
      toast({ title: "Listing published", description: "The asset is now live in the catalog.", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Asset approvals</h1>
      <p className="text-neutral-500 mb-8">
        Moderate newly submitted assets and publish ready listings.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
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
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button variant="outline" onClick={() => setRejectTarget(asset)}>
                        <XIcon className="w-4 h-4 mr-1" />
                        Reject
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

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject asset</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{rejectTarget?.title}". The owner will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
            >
              Reject asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
