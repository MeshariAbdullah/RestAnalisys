import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, AlertCircle, Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function ReviewForm({ rentalId, onDone }: { rentalId: number; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => reviewsApi.create({ rentalId, rating, title: title || undefined, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
      <p className="font-semibold text-sm mb-3">Leave a review</p>
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i + 1)}
          >
            <Star
              className={`w-6 h-6 cursor-pointer transition-colors ${
                i < (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-neutral-300"
              }`}
            />
          </button>
        ))}
      </div>
      <Input
        placeholder="Review title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2"
      />
      <textarea
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full px-3 py-2 border rounded-md text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Submitting..." : "Submit Review"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function MyRentals() {
  const [reviewingRentalId, setReviewingRentalId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => reviewsApi.mine(),
  });

  const reviewedRentalIds = new Set(myReviews?.map((r) => r.rentalId) ?? []);

  const canReview = (rental: Rental) =>
    ["closed", "closed_with_penalty"].includes(rental.status) &&
    !reviewedRentalIds.has(rental.id);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-8">
        Track contracts, shipments and returns.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
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
                    <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                    <p className="font-semibold mt-1">
                      {r.startDate} → {r.endDate}{" "}
                      <span className="text-neutral-500 font-normal">
                        ({r.durationDays} days)
                      </span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      {reviewedRentalIds.has(r.id) && (
                        <Badge className="bg-amber-100 text-amber-800 border-0">
                          <Star className="w-3 h-3 mr-1 fill-amber-500" />
                          Reviewed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase">Total paid</p>
                    <p className="font-bold text-lg">{formatSar(r.totalPayableHalalas)}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Commitment {formatSar(r.legalCommitmentHalalas)} ({r.legalCommitmentPct}%)
                    </p>
                    {canReview(r) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setReviewingRentalId(r.id)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Write Review
                      </Button>
                    )}
                  </div>
                </div>
                {reviewingRentalId === r.id && (
                  <ReviewForm
                    rentalId={r.id}
                    onDone={() => setReviewingRentalId(null)}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
