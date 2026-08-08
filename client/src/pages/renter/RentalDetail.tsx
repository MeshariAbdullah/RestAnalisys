import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSignature,
  Shield,
  CreditCard,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

function statusColor(s: string): string {
  if (["closed"].includes(s)) return "bg-green-100 text-green-700";
  if (["active", "confirmed"].includes(s)) return "bg-blue-100 text-blue-700";
  if (s.startsWith("pending") || s === "under_inspection" || s === "return_in_transit")
    return "bg-amber-100 text-amber-800";
  if (["in_dispute", "enforcement", "closed_with_penalty"].includes(s))
    return "bg-red-100 text-red-700";
  if (s === "cancelled") return "bg-neutral-200 text-neutral-600";
  return "bg-neutral-200 text-neutral-700";
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("service");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  async function handleOpenDispute() {
    if (!disputeSummary.trim()) return;
    setSubmittingDispute(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      });
      setShowDispute(false);
      setDisputeSummary("");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmittingDispute(false);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading rental…</div>;

  const { rental, legal, sanad, payments } = data;

  const canCancel = [
    "pending_risk_review",
    "pending_legal_signing",
    "pending_payment",
  ].includes(rental.status);

  const canDispute = ["active", "under_inspection", "closed_with_penalty"].includes(
    rental.status
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back to My Rentals
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${statusColor(rental.status)} border-0 text-sm px-3 py-1`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" /> Rental summary
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">Period</p>
                  <p className="font-medium">
                    {rental.startDate} → {rental.endDate}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Duration</p>
                  <p className="font-medium">{rental.durationDays} days</p>
                </div>
                <div>
                  <p className="text-neutral-500">Daily price</p>
                  <p className="font-medium">{formatSar(rental.dailyPriceHalalas)}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Subtotal</p>
                  <p className="font-medium">
                    {formatSar(rental.rentalSubtotalHalalas)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Platform fee</p>
                  <p className="font-medium">{formatSar(rental.platformFeeHalalas)}</p>
                </div>
                <div>
                  <p className="text-neutral-500">VAT (15%)</p>
                  <p className="font-medium">{formatSar(rental.vatHalalas)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center border-t mt-4 pt-4">
                <p className="font-semibold">Total payable</p>
                <p className="text-xl font-bold">
                  {formatSar(rental.totalPayableHalalas)}
                </p>
              </div>
            </CardContent>
          </Card>

          {legal && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <FileSignature className="w-4 h-4" /> Legal commitment
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Status</p>
                    <Badge
                      className={
                        legal.status === "signed"
                          ? "bg-green-100 text-green-700 border-0"
                          : "bg-amber-100 text-amber-800 border-0"
                      }
                    >
                      {legal.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-neutral-500">Contract version</p>
                    <p className="font-medium">{legal.contractVersion}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Commitment amount</p>
                    <p className="font-bold text-amber-700">
                      {formatSar(legal.commitmentHalalas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Commitment %</p>
                    <p className="font-medium">{legal.commitmentPct}%</p>
                  </div>
                </div>
                {legal.signedAt && (
                  <p className="text-xs text-neutral-500 mt-3">
                    Signed on {new Date(legal.signedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {sanad && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Nafith Sanad
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Status</p>
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      {sanad.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-neutral-500">Reference</p>
                    <p className="font-mono font-medium">
                      {sanad.nafithReference ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Principal</p>
                    <p className="font-medium">{formatSar(sanad.principalHalalas)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Maturity</p>
                    <p className="font-medium">{sanad.maturityDate ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Payments
                </h2>
                <div className="space-y-3">
                  {payments.map((p: Payment) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {p.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(p.createdAt).toLocaleDateString()} · {p.gateway}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatSar(p.amountHalalas)}</p>
                        <Badge
                          className={
                            p.status === "captured"
                              ? "bg-green-100 text-green-700 border-0"
                              : "bg-neutral-200 text-neutral-700 border-0"
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
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 text-sm">Timeline</h3>
              <div className="space-y-3 text-sm">
                <TimelineItem
                  label="Created"
                  date={rental.createdAt}
                  done
                />
                <TimelineItem
                  label="Confirmed"
                  date={rental.confirmedAt}
                  done={!!rental.confirmedAt}
                />
                <TimelineItem
                  label="Delivered"
                  date={rental.deliveredAt}
                  done={!!rental.deliveredAt}
                />
                <TimelineItem
                  label="Returned"
                  date={rental.returnedAt}
                  done={!!rental.returnedAt}
                />
                <TimelineItem
                  label="Closed"
                  date={rental.closedAt}
                  done={!!rental.closedAt}
                />
              </div>
            </CardContent>
          </Card>

          {canCancel && (
            <Card className="border-red-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Cancel rental
                </h3>
                <Input
                  placeholder="Reason for cancellation"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mb-3"
                />
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  disabled={cancelling || !cancelReason.trim()}
                  onClick={handleCancel}
                >
                  {cancelling ? "Cancelling…" : "Cancel this rental"}
                </Button>
              </CardContent>
            </Card>
          )}

          {canDispute && !showDispute && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDispute(true)}
            >
              <AlertCircle className="w-4 h-4 mr-1.5" />
              Open a dispute
            </Button>
          )}

          {showDispute && (
            <Card className="border-amber-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 text-sm">Open dispute</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                      value={disputeCategory}
                      onChange={(e) => setDisputeCategory(e.target.value)}
                    >
                      <option value="damage">Damage</option>
                      <option value="loss">Loss</option>
                      <option value="fraud">Fraud</option>
                      <option value="service">Service</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Summary</Label>
                    <Input
                      placeholder="Describe the issue (min 10 chars)"
                      value={disputeSummary}
                      onChange={(e) => setDisputeSummary(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={submittingDispute || disputeSummary.length < 10}
                      onClick={handleOpenDispute}
                    >
                      {submittingDispute ? "Submitting…" : "Submit dispute"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDispute(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  done,
}: {
  label: string;
  date?: string | null;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${
          done ? "bg-green-500" : "bg-neutral-300"
        }`}
      />
      <div className="flex-1 flex justify-between">
        <span className={done ? "text-neutral-900" : "text-neutral-400"}>
          {label}
        </span>
        <span className="text-neutral-500 text-xs">
          {date ? new Date(date).toLocaleDateString() : "—"}
        </span>
      </div>
    </div>
  );
}
