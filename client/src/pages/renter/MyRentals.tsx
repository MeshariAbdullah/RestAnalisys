import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, reviewsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function ReviewForm({ rentalId, onDone }: { rentalId: number; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const submitReview = useMutation({
    mutationFn: () => reviewsApi.create(rentalId, rating, comment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      onDone();
    },
  });

  return (
    <div className="mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
      <p className="text-sm font-medium mb-2">Rate your experience</p>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} onClick={() => setRating(v)}>
            <Star
              className={`w-6 h-6 cursor-pointer transition-colors ${
                v <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300 hover:text-amber-300"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        placeholder="Optional comment…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full text-sm p-2 border rounded-md mb-2 resize-none h-16"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => submitReview.mutate()}
          disabled={rating === 0 || submitReview.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-neutral-950"
        >
          {submitReview.isPending ? "Submitting…" : "Submit review"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {submitReview.isError && (
        <p className="text-xs text-red-600 mt-1">
          {(submitReview.error as Error).message}
        </p>
      )}
    </div>
  );
}

export default function MyRentals() {
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => reviewsApi.mine(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>You haven't rented anything yet.</p>
            <a
              href="/browse"
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Browse the collection →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((r: Rental) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-neutral-500">
                      {r.reference}
                    </p>
                    <p className="font-semibold mt-1">
                      {r.startDate} → {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">
                        ({r.durationDays} days)
                      </span>
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase">Total paid</p>
                    <p className="font-bold text-lg">
                      {formatSar(r.totalPayableHalalas)}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Commitment {formatSar(r.legalCommitmentHalalas)} (
                      {r.legalCommitmentPct}%)
                    </p>
                    {["closed", "closed_with_penalty"].includes(r.status) &&
                      !myReviews?.find((rev) => rev.rentalId === r.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs"
                          onClick={() => setReviewingId(reviewingId === r.id ? null : r.id)}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Leave review
                        </Button>
                      )}
                    {myReviews?.find((rev) => rev.rentalId === r.id) && (
                      <div className="flex items-center gap-0.5 mt-2 justify-end">
                        {Array.from({ length: myReviews.find((rev) => rev.rentalId === r.id)!.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-xs text-neutral-400 ml-1">Reviewed</span>
                      </div>
                    )}
                  </div>
                </div>
                {reviewingId === r.id && (
                  <ReviewForm rentalId={r.id} onDone={() => setReviewingId(null)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
