import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Shield,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: typeof Clock; label: string }
> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Risk Review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText, label: "Awaiting Signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting Payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package, label: "Out for Delivery" },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package, label: "Return in Transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under Inspection" },
  closed: { color: "bg-neutral-200 text-neutral-600", icon: CheckCircle, label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Closed (Penalty)" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "In Dispute" },
  enforcement: { color: "bg-red-100 text-red-800", icon: Shield, label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle, label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: "bg-neutral-200 text-neutral-600", icon: Clock, label: status };
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} hover:${cfg.color} border-0 text-sm px-3 py-1`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {cfg.label}
    </Badge>
  );
}

const CANCELLABLE = ["pending_risk_review", "pending_legal_signing", "pending_payment"];
const DISPUTABLE = ["active", "return_in_transit", "under_inspection", "closed_with_penalty"];

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("service");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMut = useMutation({
    mutationFn: () => rentalsApi.cancel(id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowCancel(false);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const disputeMut = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      setShowDispute(false);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
        Rental not found.
      </div>
    );
  }

  const { rental, legal, sanad, payments: pays } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Rentals
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">Rental Period</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-500">Start</span>
                <span className="font-medium">{rental.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">End</span>
                <span className="font-medium">{rental.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Duration</span>
                <span className="font-medium">{rental.durationDays} days</span>
              </div>
              {rental.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Delivered</span>
                  <span className="font-medium">{new Date(rental.deliveredAt).toLocaleDateString()}</span>
                </div>
              )}
              {rental.returnedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Returned</span>
                  <span className="font-medium">{new Date(rental.returnedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">Pricing</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-500">Daily Rate</span>
                <span className="font-medium">{formatSar(rental.dailyPriceHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Platform Fee</span>
                <span>{formatSar(rental.platformFeeHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">VAT (15%)</span>
                <span>{formatSar(rental.vatHalalas)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 mt-3">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {legal && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">Legal Commitment</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge variant="outline">{legal.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Commitment</span>
                  <span className="font-medium">
                    {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                  </span>
                </div>
                {legal.signedAt && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Signed</span>
                    <span>{new Date(legal.signedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">Sanad (Promissory Note)</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge variant="outline">{sanad.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Principal</span>
                  <span className="font-medium">{formatSar(sanad.principalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Maturity</span>
                  <span>{sanad.maturityDate}</span>
                </div>
                {sanad.nafithReference && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Nafith Ref</span>
                    <span className="font-mono text-xs">{sanad.nafithReference}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {pays && pays.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-4">Payments</h2>
            <div className="space-y-3">
              {pays.map((p: Payment) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium capitalize">{p.type.replace(/_/g, " ")}</span>
                    <span className="text-neutral-500 text-xs ml-2">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "captured"
                          ? "text-green-700 border-green-300"
                          : p.status === "failed"
                          ? "text-red-700 border-red-300"
                          : ""
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {CANCELLABLE.includes(rental.status) && (
          <>
            {!showCancel ? (
              <Button variant="destructive" onClick={() => setShowCancel(true)}>
                Cancel Rental
              </Button>
            ) : (
              <Card className="w-full">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">Cancel this rental</h3>
                  <div>
                    <Label>Reason</Label>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Why are you cancelling?"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => cancelMut.mutate()}
                      disabled={cancelReason.length < 3 || cancelMut.isPending}
                    >
                      {cancelMut.isPending ? "Cancelling..." : "Confirm Cancel"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCancel(false)}>
                      Never mind
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {DISPUTABLE.includes(rental.status) && (
          <>
            {!showDispute ? (
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setShowDispute(true)}
              >
                Open Dispute
              </Button>
            ) : (
              <Card className="w-full">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">Open a dispute</h3>
                  <div>
                    <Label>Category</Label>
                    <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="damage">Damage</SelectItem>
                        <SelectItem value="loss">Loss</SelectItem>
                        <SelectItem value="fraud">Fraud</SelectItem>
                        <SelectItem value="service">Service Issue</SelectItem>
                        <SelectItem value="billing">Billing Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={disputeSummary}
                      onChange={(e) => setDisputeSummary(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => disputeMut.mutate()}
                      disabled={disputeSummary.length < 10 || disputeMut.isPending}
                    >
                      {disputeMut.isPending ? "Submitting..." : "Submit Dispute"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowDispute(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
