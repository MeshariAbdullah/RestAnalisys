import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Diamond, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inspectionsApi, formatSar, type Asset, type Rental } from "@/lib/api";

export default function InspectorDashboard() {
  const intakeQueue = useQuery({
    queryKey: ["inspection-queue"],
    queryFn: () => inspectionsApi.queue(),
  });

  const returnQueue = useQuery({
    queryKey: ["return-inspection-queue"],
    queryFn: () => inspectionsApi.returnQueue(),
  });

  const intakeAssets = (intakeQueue.data ?? []).filter(
    (a: Asset) => a.status === "in_inspection"
  );
  const returnAssets = (intakeQueue.data ?? []).filter(
    (a: Asset) => a.status === "returned_under_inspection"
  );
  const returnRentals = returnQueue.data ?? [];

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

      {intakeAssets.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-500" />
            Intake inspections ({intakeAssets.length})
          </h2>
          <div className="space-y-3 mb-8">
            {intakeAssets.map((asset: Asset) => (
              <Card key={asset.id}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-16 h-16 bg-neutral-100 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                    {asset.submissionImagesJson?.[0] ? (
                      <img
                        src={asset.submissionImagesJson[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Diamond className="w-8 h-8 text-neutral-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider text-neutral-500">
                      {asset.brand}
                    </p>
                    <p className="font-semibold truncate">{asset.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">intake</Badge>
                      <span className="text-xs text-neutral-500">
                        Declared: {formatSar(asset.ownerDeclaredValueHalalas)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/inspector/report/${asset.id}`}>
                    <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                      Inspect
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {returnRentals.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            Return inspections ({returnRentals.length})
          </h2>
          <div className="space-y-3 mb-8">
            {returnRentals.map((rental: Rental) => (
              <Card key={rental.id}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-16 h-16 bg-neutral-100 rounded-md flex items-center justify-center shrink-0">
                    <RotateCcw className="w-8 h-8 text-neutral-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-neutral-500">
                      {rental.reference}
                    </p>
                    <p className="font-semibold">
                      {rental.startDate} - {rental.endDate} ({rental.durationDays} days)
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        return inspection
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        Total: {formatSar(rental.totalPayableHalalas)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/inspector/return/${rental.id}`}>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      Inspect return
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {intakeAssets.length === 0 && returnRentals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No items in the queue right now.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
