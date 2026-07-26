import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, FileSignature, CreditCard, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, disputesApi, formatSar, type Rental } from "@/lib/api";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_risk_review: "bg-neutral-200 text-neutral-700",
    pending_legal_signing: "bg-amber-100 text-amber-800",
    pending_payment: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-700",
    out_for_delivery: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    return_in_transit: "bg-amber-100 text-amber-800",
    under_inspection: "bg-amber-100 text-amber-800",
    closed: "bg-green-100 text-green-700",
    closed_with_penalty: "bg-red-100 text-red-700",
    in_dispute: "bg-red-100 text-red-700",
    enforcement: "bg-red-100 text-red-700",
    cancelled: "bg-neutral-200 text-neutral-600",
  };
  return (
    <Badge className={`${colors[status] ?? "bg-neutral-200 text-neutral-700"} border-0`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("service");
  const [disputeSummary, setDisputeSummary] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      setShowCancel(false);
      setCancelReason("");
      await refetch();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDispute() {
    if (!disputeSummary.trim() || disputeSummary.length < 10) return;
    setError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      });
      setShowDispute(false);
      setDisputeSummary("");
      await refetch();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading...</div>;

  const { rental, legal, sanad, payments } = data;
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(rental.status);
  const canDispute = ["active", "closed", "closed_with_penalty"].includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold">Rental details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-amber-600" />
              <p className="font-semibold">Rental summary</p>
            </div>
            <Row label="Period" value={`${rental.startDate} to ${rental.endDate}`} />
            <Row label="Duration" value={`${rental.durationDays} days`} />
            <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
            <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
            <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
            <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileSignature className="w-5 h-5 text-amber-600" />
              <p className="font-semibold">Legal commitment</p>
            </div>
            {legal ? (
              <>
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Commitment" value={formatSar(legal.commitmentHalalas)} />
                <Row label="Percentage" value={`${legal.commitmentPct}%`} />
                <Row label="Version" value={legal.contractVersion} />
                {legal.signedAt && <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />}
              </>
            ) : (
              <p className="text-neutral-500">No legal commitment yet.</p>
            )}

            {sanad && (
              <div className="border-t pt-3 mt-3">
                <p className="font-semibold mb-2">Sanad (promissory note)</p>
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                {sanad.maturityDate && <Row label="Maturity" value={sanad.maturityDate} />}
                {sanad.nafithReference && <Row label="Nafith ref" value={sanad.nafithReference} />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <p className="font-semibold">Payments</p>
            </div>
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <span className="font-medium">{p.type.replace(/_/g, " ")}</span>
                    <span className="text-neutral-500 ml-2">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    <span className="font-mono">{formatSar(p.amountHalalas)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        {canCancel && (
          <div>
            {showCancel ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="border rounded px-3 py-1.5 text-sm w-64"
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Confirm cancel
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCancel(false)}>
                  Back
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowCancel(true)}>
                Cancel rental
              </Button>
            )}
          </div>
        )}

        {canDispute && !showDispute && (
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowDispute(true)}
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Open dispute
          </Button>
        )}
      </div>

      {showDispute && (
        <Card className="mt-4 border-red-200">
          <CardContent className="p-6">
            <p className="font-semibold mb-3">Open a dispute</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="border rounded px-3 py-1.5 text-sm w-full"
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                >
                  <option value="damage">Damage</option>
                  <option value="loss">Loss</option>
                  <option value="fraud">Fraud</option>
                  <option value="service">Service issue</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Summary (min 10 chars)</label>
                <textarea
                  className="border rounded px-3 py-1.5 text-sm w-full"
                  rows={3}
                  placeholder="Describe the issue..."
                  value={disputeSummary}
                  onChange={(e) => setDisputeSummary(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDispute}
                  disabled={disputeSummary.length < 10}
                >
                  Submit dispute
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowDispute(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "--"}</span>
    </div>
  );
}
