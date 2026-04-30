import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Diamond, RotateCcw, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inspectionsApi, rentalsApi, formatSar, type Asset } from "@/lib/api";

export default function InspectorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["inspection-queue"],
    queryFn: () => inspectionsApi.queue(),
  });

  const { data: allRentals } = useQuery({
    queryKey: ["rentals-list"],
    queryFn: () => rentalsApi.list(),
  });

  const rentalByAsset = new Map<number, number>();
  allRentals?.forEach((r) => {
    if (r.status === "under_inspection") {
      rentalByAsset.set(r.assetId, r.id);
    }
  });

  const intakeQueue = (data ?? []).filter((a: Asset) => a.status === "in_inspection");
  const returnQueue = (data ?? []).filter((a: Asset) => a.status === "returned_under_inspection");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <ClipboardCheck className="w-4 h-4" />
        Inspector queue
      </div>
      <h1 className="text-3xl font-bold mb-1">Inspection queue</h1>
      <p className="text-neutral-500 mb-8">
        Assets awaiting authentication, valuation or return inspection.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : (!data || data.length === 0) ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No assets in the queue right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {intakeQueue.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                Intake inspections
                <Badge variant="outline">{intakeQueue.length}</Badge>
              </h2>
              <div className="space-y-3">
                {intakeQueue.map((asset: Asset) => (
                  <Card key={asset.id}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-16 h-16 bg-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                        {asset.submissionImagesJson?.[0] ? (
                          <img src={asset.submissionImagesJson[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Diamond className="w-8 h-8 text-neutral-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wider text-neutral-500">{asset.brand}</p>
                        <p className="font-semibold truncate">{asset.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-amber-100 text-amber-800 border-0">New intake</Badge>
                          <span className="text-xs text-neutral-500">Declared: {formatSar(asset.ownerDeclaredValueHalalas)}</span>
                        </div>
                      </div>
                      <Link href={`/inspector/report/${asset.id}`}>
                        <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                          Inspect
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {returnQueue.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                Return inspections
                <Badge variant="outline">{returnQueue.length}</Badge>
              </h2>
              <div className="space-y-3">
                {returnQueue.map((asset: Asset) => {
                  const rId = rentalByAsset.get(asset.id);
                  return (
                    <Card key={asset.id}>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-16 h-16 bg-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                          {asset.submissionImagesJson?.[0] ? (
                            <img src={asset.submissionImagesJson[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Diamond className="w-8 h-8 text-neutral-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase tracking-wider text-neutral-500">{asset.brand}</p>
                          <p className="font-semibold truncate">{asset.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-blue-100 text-blue-800 border-0">Return</Badge>
                            <span className="text-xs text-neutral-500">Value: {formatSar(asset.evaluatedValueHalalas)}</span>
                          </div>
                        </div>
                        {rId ? (
                          <Link href={`/inspector/return/${asset.id}/${rId}`}>
                            <Button className="bg-blue-600 text-white hover:bg-blue-500">
                              Inspect return
                              <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                          </Link>
                        ) : (
                          <Button disabled variant="outline">No rental linked</Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
