import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, CheckCircle, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ownerAgreementsApi, type OwnerAgreement } from "@/lib/api";

function statusBadge(agreement: OwnerAgreement) {
  if (agreement.signedAt) return <Badge className="bg-green-100 text-green-700 border-0">Signed</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-0">Pending signature</Badge>;
}

export default function Agreements() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["owner-agreements-mine"],
    queryFn: () => ownerAgreementsApi.mine(),
  });

  const createMutation = useMutation({
    mutationFn: () => ownerAgreementsApi.create({ guaranteeAccepted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-agreements-mine"] });
      setCreating(false);
    },
  });

  const signMutation = useMutation({
    mutationFn: (id: number) => ownerAgreementsApi.sign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-agreements-mine"] });
    },
  });

  const hasActiveAgreement = agreements.some(
    (a) => a.signedAt && (!a.effectiveUntil || new Date(a.effectiveUntil) > new Date())
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Consignment agreements</h1>
          <p className="text-neutral-500 mt-1">
            Your agreements with MLR for asset management
          </p>
        </div>
        {!hasActiveAgreement && (
          <Button
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {createMutation.isPending ? "Creating…" : "New agreement"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : agreements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No agreements yet.</p>
            <p className="text-sm mt-1">
              Create an agreement to start submitting assets to MLR.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agreements.map((agreement) => (
            <Card key={agreement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {agreement.signedAt ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-semibold">
                        Agreement v{agreement.version}
                      </p>
                      <p className="text-sm text-neutral-500">
                        Commission: {agreement.commissionPct}% platform fee
                      </p>
                      {agreement.effectiveFrom && (
                        <p className="text-xs text-neutral-400 mt-1">
                          Effective: {new Date(agreement.effectiveFrom).toLocaleDateString()}
                          {agreement.effectiveUntil &&
                            ` — ${new Date(agreement.effectiveUntil).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(agreement)}
                    {!agreement.signedAt && (
                      <Button
                        size="sm"
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        onClick={() => signMutation.mutate(agreement.id)}
                        disabled={signMutation.isPending}
                      >
                        {signMutation.isPending ? "Signing…" : "Sign"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-4 bg-neutral-50 rounded-md text-sm text-neutral-600 space-y-2">
                  <p>
                    By signing this agreement, you authorize MLR to manage,
                    store, insure, and rent your luxury assets on your behalf.
                  </p>
                  <p>
                    MLR guarantees either the safe return of each consigned
                    asset or full compensation equal to its evaluated value.
                  </p>
                  <p>
                    Platform commission of {agreement.commissionPct}% is
                    deducted from each rental payout.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {createMutation.isError && (
        <p className="text-red-600 text-sm mt-4">
          {(createMutation.error as Error).message}
        </p>
      )}
      {signMutation.isError && (
        <p className="text-red-600 text-sm mt-4">
          {(signMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
