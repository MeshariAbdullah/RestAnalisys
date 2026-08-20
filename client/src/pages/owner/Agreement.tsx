import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ownerAgreementsApi, type OwnerAgreement } from "@/lib/api";

export default function Agreement() {
  const qc = useQueryClient();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["owner-agreements-mine"],
    queryFn: () => ownerAgreementsApi.mine(),
  });

  const agreements = data ?? [];
  const active = agreements.find((a) => a.signedAt && !a.effectiveUntil);

  async function handleSign() {
    setSigning(true);
    setError(null);
    try {
      await ownerAgreementsApi.sign(20);
      await qc.invalidateQueries({ queryKey: ["owner-agreements-mine"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Consignment Agreement</h1>
      <p className="text-neutral-500 mb-8">
        Your agreement with MLR to consign luxury assets on the platform.
      </p>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : active ? (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold">Active Agreement</h2>
                  <Badge className="bg-green-100 text-green-700">v{active.version}</Badge>
                </div>
                <div className="space-y-2 text-sm text-neutral-600 mt-3">
                  <p>
                    <span className="font-medium text-neutral-900">Platform commission:</span>{" "}
                    {active.commissionPct}%
                  </p>
                  <p>
                    <span className="font-medium text-neutral-900">Owner guarantee:</span>{" "}
                    {active.guaranteeAccepted ? "Accepted" : "Pending"}
                  </p>
                  <p>
                    <span className="font-medium text-neutral-900">Signed:</span>{" "}
                    {active.signedAt
                      ? new Date(active.signedAt).toLocaleDateString("en-SA", {
                          dateStyle: "long",
                        })
                      : "Not signed"}
                  </p>
                  <p>
                    <span className="font-medium text-neutral-900">Effective from:</span>{" "}
                    {active.effectiveFrom
                      ? new Date(active.effectiveFrom).toLocaleDateString("en-SA", {
                          dateStyle: "long",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <FileSignature className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">
                  Sign your consignment agreement
                </h2>
                <p className="text-sm text-neutral-600 mb-4">
                  Before submitting assets, you need to sign the MLR Consignment
                  Agreement. This agreement establishes the terms under which MLR
                  will manage, insure, and rent your luxury items.
                </p>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-4 text-sm space-y-2">
                  <p>
                    <span className="font-medium">Platform commission:</span> 20% of rental revenue
                  </p>
                  <p>
                    <span className="font-medium">Owner guarantee:</span> MLR guarantees either the
                    return of the asset or full compensation equal to the evaluated
                    value
                  </p>
                  <p>
                    <span className="font-medium">Insurance:</span> All assets are covered
                    while in MLR custody
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleSign}
                  disabled={signing}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  <FileSignature className="w-4 h-4 mr-1.5" />
                  {signing ? "Signing..." : "Sign Agreement"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {agreements.length > 1 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Agreement history
          </h3>
          <div className="space-y-2">
            {agreements.slice(1).map((a: OwnerAgreement) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">v{a.version}</span>
                    <span className="text-neutral-500 ml-2">
                      {a.commissionPct}% commission
                    </span>
                  </div>
                  <span className="text-neutral-500">
                    {a.signedAt
                      ? new Date(a.signedAt).toLocaleDateString()
                      : "Not signed"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
