import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  FileSignature,
  CreditCard,
  Star,
  CalendarPlus,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  rentalsApi,
  paymentsApi,
  legalApi,
  extensionsApi,
  ratingsApi,
  formatSar,
} from "@/lib/api";

const STEPS = [
  { key: "pending_legal_signing", label: "Sign Contract", icon: FileSignature },
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "out_for_delivery", label: "Shipping", icon: Truck },
  { key: "active", label: "Active", icon: Package },
  { key: "return_in_transit", label: "Returning", icon: Truck },
  { key: "under_inspection", label: "Inspection", icon: Clock },
  { key: "closed", label: "Closed", icon: CheckCircle },
];

function statusIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  if (status === "closed_with_penalty" || status === "closed") return STEPS.length - 1;
  return idx >= 0 ? idx : -1;
}

export default function RentalDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const [extDays, setExtDays] = useState(3);
  const [extReason, setExtReason] = useState("");
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showExtForm, setShowExtForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const signLegal = useMutation({
    mutationFn: (commitmentId: number) => legalApi.sign(commitmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  const pay = useMutation({
    mutationFn: () => paymentsApi.charge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  const cancel = useMutation({
    mutationFn: () => rentalsApi.cancel(id, "Renter requested cancellation"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rental", id] }),
  });

  const requestExtension = useMutation({
    mutationFn: () => extensionsApi.request(id, extDays, extReason || undefined),
    onSuccess: () => {
      setShowExtForm(false);
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    },
  });

  const submitRating = useMutation({
    mutationFn: () =>
      ratingsApi.create({
        rentalId: id,
        overallScore: ratingScore,
        comment: ratingComment || undefined,
      }),
    onSuccess: () => {
      setShowRatingForm(false);
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 bg-neutral-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const { rental, legal, sanad, payments: pays } = data;
  const currentIdx = statusIndex(rental.status);
  const isClosed = ["closed", "closed_with_penalty"].includes(rental.status);
  const isCancelled = rental.status === "cancelled";

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge
          className={
            isClosed
              ? "bg-green-100 text-green-700"
              : isCancelled
                ? "bg-neutral-200 text-neutral-600"
                : "bg-blue-100 text-blue-700"
          }
        >
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Progress tracker */}
      {!isCancelled && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-1 overflow-x-auto">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx <= currentIdx;
                const active = idx === currentIdx;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center min-w-[70px]">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          done
                            ? active
                              ? "bg-amber-500 text-white"
                              : "bg-green-500 text-white"
                            : "bg-neutral-200 text-neutral-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] mt-1 text-center ${
                          done ? "text-neutral-700 font-medium" : "text-neutral-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 min-w-[20px] ${
                          idx < currentIdx ? "bg-green-400" : "bg-neutral-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial summary */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Financial Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Duration</p>
              <p className="font-medium">
                {rental.durationDays} days ({rental.startDate} - {rental.endDate})
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Daily Rate</p>
              <p className="font-medium">{formatSar(rental.dailyPriceHalalas)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Total</p>
              <p className="font-bold text-lg">{formatSar(rental.totalPayableHalalas)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Legal Commitment</p>
              <p className="font-medium">
                {formatSar(rental.legalCommitmentHalalas)} ({rental.legalCommitmentPct}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">Actions</h2>

          {rental.status === "pending_legal_signing" && legal && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => signLegal.mutate(legal.id)}
                disabled={signLegal.isPending}
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Sign Contract
              </Button>
              <Button
                variant="outline"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {rental.status === "pending_payment" && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => pay.mutate()}
                disabled={pay.isPending}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay {formatSar(rental.totalPayableHalalas)}
              </Button>
              <Button
                variant="outline"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {rental.status === "active" && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowExtForm(!showExtForm)}
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Request Extension
              </Button>
              {showExtForm && (
                <div className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Extra Days</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={extDays}
                      onChange={(e) => setExtDays(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Input
                      value={extReason}
                      onChange={(e) => setExtReason(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => requestExtension.mutate()}
                    disabled={requestExtension.isPending}
                  >
                    Submit Request
                  </Button>
                </div>
              )}
            </div>
          )}

          {isClosed && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowRatingForm(!showRatingForm)}
              >
                <Star className="w-4 h-4 mr-2" />
                Rate This Rental
              </Button>
              {showRatingForm && (
                <div className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Rating (1-5)</Label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRatingScore(n)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              n <= ratingScore
                                ? "text-amber-400 fill-amber-400"
                                : "text-neutral-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Comment (optional)</Label>
                    <Textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => submitRating.mutate()}
                    disabled={submitRating.isPending}
                  >
                    Submit Rating
                  </Button>
                </div>
              )}
            </div>
          )}

          {isCancelled && (
            <p className="text-neutral-500 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              This rental was cancelled.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      {pays && pays.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Payments</h2>
            <div className="space-y-2">
              {pays.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{p.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-neutral-500">{p.gateway}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatSar(p.amountHalalas)}</p>
                    <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal info */}
      {legal && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Legal Commitment</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Status</p>
                <Badge>{legal.status}</Badge>
              </div>
              <div>
                <p className="text-neutral-500">Commitment Amount</p>
                <p className="font-medium">{formatSar(legal.commitmentHalalas)}</p>
              </div>
              {legal.signedAt && (
                <div>
                  <p className="text-neutral-500">Signed At</p>
                  <p>{new Date(legal.signedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sanad info */}
      {sanad && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Sanad (Promissory Note)</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Status</p>
                <Badge>{sanad.status}</Badge>
              </div>
              <div>
                <p className="text-neutral-500">Reference</p>
                <p className="font-mono text-xs">{sanad.nafithReference ?? "Pending"}</p>
              </div>
              <div>
                <p className="text-neutral-500">Principal</p>
                <p className="font-medium">{formatSar(sanad.principalHalalas)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Maturity</p>
                <p>{sanad.maturityDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
