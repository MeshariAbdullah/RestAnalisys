import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, formatSar } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function RiskReview() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "risk-review"],
    queryFn: adminApi.pendingRiskReview,
  });

  const reviewMut = useMutation({
    mutationFn: (args: { rentalId: number; approved: boolean; rejectionReason?: string }) =>
      adminApi.riskReview(args.rentalId, args.approved, args.rejectionReason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "risk-review"] }),
  });

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  if (isLoading) return <p className="p-6 text-muted-foreground">Loading...</p>;

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual Risk Review</h1>
        <p className="text-muted-foreground">
          Rentals flagged by the risk engine for manual approval (trust score 25-40).
        </p>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No rentals pending risk review.
          </CardContent>
        </Card>
      )}

      {items.map(({ rental, renterName, renterEmail, renterTrustScore }) => (
        <Card key={rental.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{rental.reference}</span>
              <Badge variant="outline">Trust Score: {renterTrustScore}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Renter:</span>{" "}
                {renterName} ({renterEmail})
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                {formatSar(rental.totalPayableHalalas)}
              </div>
              <div>
                <span className="text-muted-foreground">Dates:</span>{" "}
                {rental.startDate} to {rental.endDate} ({rental.durationDays}d)
              </div>
              <div>
                <span className="text-muted-foreground">Legal Commitment:</span>{" "}
                {formatSar(rental.legalCommitmentHalalas)} ({rental.legalCommitmentPct}%)
              </div>
            </div>

            {rejectId === rental.id ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Rejection reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!reason.trim() || reviewMut.isPending}
                    onClick={() => {
                      reviewMut.mutate({
                        rentalId: rental.id,
                        approved: false,
                        rejectionReason: reason,
                      });
                      setRejectId(null);
                      setReason("");
                    }}
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setRejectId(null); setReason(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={reviewMut.isPending}
                  onClick={() =>
                    reviewMut.mutate({ rentalId: rental.id, approved: true })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectId(rental.id)}
                >
                  Reject
                </Button>
              </div>
            )}

            {reviewMut.isError && (
              <p className="text-sm text-destructive">
                {(reviewMut.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
