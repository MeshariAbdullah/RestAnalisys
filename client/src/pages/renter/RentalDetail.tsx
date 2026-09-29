import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  FileSignature,
  CreditCard,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Gavel,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";

const STATUS_STYLE: Record<string, { bg: string; icon: typeof Clock }> = {
  pending_risk_review: { bg: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: { bg: "bg-amber-100 text-amber-800", icon: FileSignature },
  pending_payment: { bg: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { bg: "bg-blue-100 text-blue-700", icon: CheckCircle },
  out_for_delivery: { bg: "bg-blue-100 text-blue-700", icon: Package },
  active: { bg: "bg-green-100 text-green-700", icon: CheckCircle },
  return_in_transit: { bg: "bg-amber-100 text-amber-800", icon: Package },
  under_inspection: { bg: "bg-amber-100 text-amber-800", icon: Clock },
  closed: { bg: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { bg: "bg-red-100 text-red-700", icon: AlertTriangle },
  in_dispute: { bg: "bg-red-100 text-red-700", icon: AlertTriangle },
  enforcement: { bg: "bg-red-100 text-red-700", icon: Gavel },
  cancelled: { bg: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeSummary, setDisputeSummary] = useState("");
  const [disputeCategory, setDisputeCategory] = useState<"damage" | "loss" | "fraud" | "service" | "billing">("service");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      setShowCancel(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenDispute() {
    if (!disputeSummary.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory,
        summary: disputeSummary,
      });
      await qc.invalidateQueries({ queryKey: ["rental", id] });
      setShowDispute(false);
      setDisputeSummary("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading rental…</div>;

  const { rental, legal, sanad, payments } = data;
  const style = STATUS_STYLE[rental.status] ?? STATUS_STYLE.pending_risk_review;
  const StatusIcon = style.icon;

  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment", "confirmed"].includes(rental.status);
  const canDispute = ["active", "return_in_transit", "under_inspection", "closed", "closed_with_penalty"].includes(rental.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${style.bg} border-0 text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Dates & pricing */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Booking summary</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Row label="Period" value={`${rental.startDate} → ${rental.endDate}`} />
                <Row label="Duration" value={`${rental.durationDays} days`} />
                <Row label="Daily price" value={formatSar(rental.dailyPriceHalalas)} />
                <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
                <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
                <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
                <div className="col-span-2 pt-3 mt-2 border-t flex justify-between font-semibold">
                  <span>Total payable</span>
                  <span className="text-lg">{formatSar(rental.totalPayableHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal commitment */}
          {legal && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileSignature className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold">Legal commitment</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                  <Row label="Contract version" value={legal.contractVersion} />
                  <Row label="Commitment" value={formatSar(legal.commitmentHalalas)} />
                  <Row label="Commitment %" value={`${legal.commitmentPct}%`} />
                  {legal.signedAt && <Row label="Signed at" value={new Date(legal.signedAt).toLocaleString()} />}
                </div>
                {rental.status === "pending_legal_signing" && (
                  <Link href={`/legal/${legal.id}`}>
                    <Button className="mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400 w-full">
                      Review & sign contract
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sanad */}
          {sanad && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold">Sanad (Promissory note)</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                  {sanad.nafithReference && <Row label="Nafith ref" value={sanad.nafithReference} />}
                  <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                  <Row label="Due amount" value={formatSar(sanad.dueHalalas)} />
                  {sanad.maturityDate && <Row label="Maturity" value={sanad.maturityDate} />}
                  {sanad.executionCaseNumber && <Row label="Execution case" value={sanad.executionCaseNumber} />}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold">Payments</h2>
                </div>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{p.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-neutral-500">
                          {p.gateway} · {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                        <Badge
                          className={
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "refunded"
                              ? "bg-amber-100 text-amber-700"
                              : p.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-neutral-100 text-neutral-600"
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

        {/* Sidebar actions */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3 text-sm">
              <h2 className="font-semibold">Timeline</h2>
              <Row label="Created" value={new Date(rental.createdAt).toLocaleDateString()} />
              {rental.confirmedAt && <Row label="Confirmed" value={new Date(rental.confirmedAt).toLocaleDateString()} />}
              {rental.deliveredAt && <Row label="Delivered" value={new Date(rental.deliveredAt).toLocaleDateString()} />}
              {rental.returnedAt && <Row label="Returned" value={new Date(rental.returnedAt).toLocaleDateString()} />}
              {rental.closedAt && <Row label="Closed" value={new Date(rental.closedAt).toLocaleDateString()} />}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3 text-sm">
              <h2 className="font-semibold">Risk snapshot</h2>
              <Row label="Trust score" value={rental.trustScoreAtBooking ?? "N/A"} />
              <Row label="Commitment %" value={`${rental.legalCommitmentPct}%`} />
              <Row label="Commitment amount" value={formatSar(rental.legalCommitmentHalalas)} />
            </CardContent>
          </Card>

          {canCancel && (
            <>
              {!showCancel ? (
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancel(true)}
                >
                  Cancel rental
                </Button>
              ) : (
                <Card className="border-red-200">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-700">Cancellation reason</p>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Why are you cancelling?"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancel}
                        disabled={actionLoading || !cancelReason.trim()}
                        className="bg-red-600 hover:bg-red-700 flex-1"
                      >
                        {actionLoading ? "Cancelling…" : "Confirm cancel"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCancel(false)}>
                        Back
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {canDispute && (
            <>
              {!showDispute ? (
                <Button
                  variant="outline"
                  className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => setShowDispute(true)}
                >
                  Open a dispute
                </Button>
              ) : (
                <Card className="border-amber-200">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-700">Dispute details</p>
                    <select
                      value={disputeCategory}
                      onChange={(e) => setDisputeCategory(e.target.value as typeof disputeCategory)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="damage">Damage</option>
                      <option value="loss">Loss</option>
                      <option value="fraud">Fraud</option>
                      <option value="service">Service issue</option>
                      <option value="billing">Billing</option>
                    </select>
                    <Textarea
                      value={disputeSummary}
                      onChange={(e) => setDisputeSummary(e.target.value)}
                      placeholder="Describe the issue…"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleOpenDispute}
                        disabled={actionLoading || !disputeSummary.trim()}
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400 flex-1"
                      >
                        {actionLoading ? "Submitting…" : "Submit dispute"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowDispute(false)}>
                        Back
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
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

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
