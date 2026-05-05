import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rentalsApi, reviewsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle },
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

function ReviewForm({ rental }: { rental: Rental }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        rentalId: rental.id,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });

  if (submit.isSuccess) {
    return (
      <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-700">
        Thank you for your review!
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-neutral-50 rounded-lg border">
      <p className="text-sm font-medium mb-2">Rate your experience</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                s <= (hover || rating)
                  ? "text-amber-500 fill-amber-500"
                  : "text-neutral-300"
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Share your experience (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="mb-3"
      />
      <Button
        size="sm"
        disabled={rating === 0 || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? "Submitting…" : "Submit Review"}
      </Button>
      {submit.isError && (
        <p className="text-xs text-red-600 mt-2">
          {(submit.error as Error).message}
        </p>
      )}
    </div>
  );
}

export default function MyRentals() {
  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => reviewsApi.mine(),
  });

  const reviewedRentalIds = new Set((myReviews ?? []).map((r) => r.rentalId));

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
          {data.map((r: Rental) => {
            const canReview =
              ["closed", "closed_with_penalty"].includes(r.status) &&
              !reviewedRentalIds.has(r.id);

            return (
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
                    </div>
                  </div>
                  {canReview && <ReviewForm rental={r} />}
                  {reviewedRentalIds.has(r.id) && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      You've reviewed this rental
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
