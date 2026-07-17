import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Shield,
  ChevronLeft,
  AlertTriangle,
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
import { rentalsApi, disputesApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  in_fulfillment: { color: "bg-blue-100 text-blue-700", icon: Package },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package },
  delivered: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  in_use: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  awaiting_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  returned: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  inspection_post_return: { color: "bg-amber-100 text-amber-800", icon: Clock },
  closed_clean: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertTriangle },
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle },
};

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [showDispute, setShowDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("service");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!confirm("Cancel this rental? This action cannot be undone.")) return;
    setCancelLoading(true);
    setError(null);
    try {
      await rentalsApi.cancel(id, "Cancelled by renter");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    setDisputeLoading(true);
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
      setDisputeLoading(false);
    }
  }

  if (isLoading || !data) return <div className="p-8">Loading...</div>;

  const { rental, legal, sanad, payments } = data;
  const meta = STATUS_META[rental.status] ?? STATUS_META.draft;
  const StatusIcon = meta.icon;

  const canCancel = [
    "pending_legal_signing",
    "pending_payment",
    "confirmed",
  ].includes(rental.status);

  const canDispute = [
    "delivered",
    "in_use",
    "awaiting_return",
    "returned",
    "inspection_post_return",
    "closed_with_penalty",
  ].includes(rental.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${meta.color} hover:${meta.color} border-0 text-sm py-1 px-3`}>
          <StatusIcon className="w-4 h-4 mr-1.5" />
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Rental period</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">Start</p>
                  <p className="font-medium">{rental.startDate}</p>
                </div>
                <div>
                  <p className="text-neutral-500">End</p>
                  <p className="font-medium">{rental.endDate}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Duration</p>
                  <p className="font-medium">{rental.durationDays} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Pricing breakdown</h2>
              <div className="space-y-2 text-sm">
                <Row label={`Daily rate x ${rental.durationDays} days`} value={formatSar(rental.rentalSubtotalHalalas)} />
                <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
                <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatSar(rental.totalPayableHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {legal && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-neutral-600" />
                  <h2 className="font-semibold text-lg">Legal commitment</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                  <Row label="Commitment" value={`${formatSar(legal.commitmentHalalas)} (${legal.commitmentPct}%)`} />
                  {legal.signedAt && <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString("en-SA")} />}
                </div>
                {legal.status === "pending_signature" && (
                  <Link href={`/legal/${legal.id}`}>
                    <Button className="mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                      Review & sign contract
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {sanad && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-neutral-600" />
                  <h2 className="font-semibold text-lg">Sanad (promissory note)</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                  {sanad.nafithReference && <Row label="Nafith ref" value={sanad.nafithReference} />}
                  <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                  <Row label="Maturity" value={sanad.maturityDate} />
                </div>
              </CardContent>
            </Card>
          )}

          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-neutral-600" />
                  <h2 className="font-semibold text-lg">Payments</h2>
                </div>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                      <div>
                        <span className="font-medium">{p.type}</span>
                        <span className="text-neutral-500 ml-2">{p.gateway}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatSar(p.amountHalalas)}</p>
                        <Badge variant="outline" className="text-[10px]">
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
            <CardContent className="p-6 space-y-3 text-sm">
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Trust score" value={`${rental.trustScoreAtBooking ?? "—"}`} />
              <Row label="Commitment" value={`${rental.legalCommitmentPct}%`} />
              <Row label="Commitment amt" value={formatSar(rental.legalCommitmentHalalas)} />
            </CardContent>
          </Card>

          {canCancel && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? "Cancelling..." : "Cancel rental"}
            </Button>
          )}

          {canDispute && !showDispute && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDispute(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Open a dispute
            </Button>
          )}

          {showDispute && (
            <Card className="border-amber-300 bg-amber-50/40">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3">Open a dispute</h3>
                <form onSubmit={handleDispute} className="space-y-3">
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
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={disputeSummary}
                      onChange={(e) => setDisputeSummary(e.target.value)}
                      placeholder="Describe the issue..."
                      className="mt-1"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={disputeLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {disputeLoading ? "Submitting..." : "Submit dispute"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDispute(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
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

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
