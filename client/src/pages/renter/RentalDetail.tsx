import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { rentalsApi, formatSar, type Rental, type LegalCommitment, type SanadRecord, type Payment } from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-yellow-100 text-yellow-800",
  pending_legal_signing: "bg-orange-100 text-orange-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  active: "bg-green-100 text-green-800",
  return_in_transit: "bg-cyan-100 text-cyan-800",
  under_inspection: "bg-purple-100 text-purple-800",
  closed: "bg-gray-100 text-gray-800",
  closed_with_penalty: "bg-red-100 text-red-800",
  in_dispute: "bg-red-100 text-red-800",
  enforcement: "bg-red-200 text-red-900",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const [data, setData] = useState<{
    rental: Rental;
    legal: LegalCommitment | null;
    sanad: SanadRecord | null;
    payments: Payment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    rentalsApi.get(id).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const canCancel = data?.rental &&
    ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(data.rental.status);

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    try {
      await rentalsApi.cancel(id, cancelReason);
      const updated = await rentalsApi.get(id);
      setData(updated);
      setCancelling(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <Layout><div className="p-8 text-center text-muted-foreground">Loading rental...</div></Layout>;
  if (error) return <Layout><div className="p-8 text-center text-red-600">{error}</div></Layout>;
  if (!data) return <Layout><div className="p-8 text-center">Rental not found</div></Layout>;

  const { rental, legal, sanad, payments } = data;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{rental.reference}</h1>
            <p className="text-muted-foreground">
              {rental.startDate} — {rental.endDate} ({rental.durationDays} days)
            </p>
          </div>
          <Badge className={STATUS_COLORS[rental.status] ?? "bg-gray-100"}>
            {rental.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Daily</div>
                <div className="font-semibold">{formatSar(rental.dailyPriceHalalas)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="font-semibold">{formatSar(rental.rentalSubtotalHalalas)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Platform Fee</div>
                <div className="font-semibold">{formatSar(rental.platformFeeHalalas)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">VAT (15%)</div>
                <div className="font-semibold">{formatSar(rental.vatHalalas)}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold text-primary">{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk & Commitment</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trust Score at Booking</span>
              <span className="font-semibold">{rental.trustScoreAtBooking ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Legal Commitment</span>
              <span className="font-semibold">{rental.legalCommitmentPct}% — {formatSar(rental.legalCommitmentHalalas)}</span>
            </div>
          </CardContent>
        </Card>

        {legal && (
          <Card>
            <CardHeader><CardTitle>Legal Commitment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline">{legal.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatSar(legal.commitmentHalalas)}</span>
              </div>
              {legal.signedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signed</span>
                  <span>{new Date(legal.signedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {sanad && (
          <Card>
            <CardHeader><CardTitle>Sanad (Promissory Note)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline">{sanad.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-semibold">{formatSar(sanad.principalHalalas)}</span>
              </div>
              {sanad.nafithReference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nafith Ref</span>
                  <span className="font-mono text-sm">{sanad.nafithReference}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {payments.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium capitalize">{p.type.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatSar(p.amountHalalas)}</span>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {canCancel && !cancelling && (
          <Button variant="destructive" onClick={() => setCancelling(true)}>Cancel Rental</Button>
        )}
        {cancelling && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={3}
                placeholder="Reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>
                  Confirm Cancel
                </Button>
                <Button variant="outline" onClick={() => setCancelling(false)}>
                  Keep Rental
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4 text-sm">
          {rental.confirmedAt && <span className="text-muted-foreground">Confirmed: {new Date(rental.confirmedAt).toLocaleDateString()}</span>}
          {rental.deliveredAt && <span className="text-muted-foreground">Delivered: {new Date(rental.deliveredAt).toLocaleDateString()}</span>}
          {rental.returnedAt && <span className="text-muted-foreground">Returned: {new Date(rental.returnedAt).toLocaleDateString()}</span>}
          {rental.closedAt && <span className="text-muted-foreground">Closed: {new Date(rental.closedAt).toLocaleDateString()}</span>}
        </div>
      </div>
    </Layout>
  );
}
