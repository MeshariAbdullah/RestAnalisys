import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileSignature,
  CreditCard,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Gavel,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, string> = {
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
  enforcement: "bg-red-200 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};

const DISPUTABLE = ["active", "return_in_transit", "under_inspection", "closed_with_penalty"];

type DisputeCategory = "damage" | "loss" | "fraud" | "service" | "billing";

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showDispute, setShowDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>("damage");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleOpenDispute() {
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory,
        summary: disputeSummary,
      });
      setShowDispute(false);
      setDisputeSummary("");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      setDisputeError((err as Error).message);
    } finally {
      setDisputeSubmitting(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Rental not found.</div>;

  const { rental, legal, sanad, payments } = data;

  const needsSigning = rental.status === "pending_legal_signing" && legal;
  const needsPayment = rental.status === "pending_payment";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${STATUS_COLORS[rental.status] ?? "bg-neutral-200"} border-0 text-sm px-3 py-1`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Rental period
              </h2>
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
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Pricing
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">
                    {formatSar(rental.dailyPriceHalalas)} x {rental.durationDays} days
                  </span>
                  <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Platform fee</span>
                  <span>{formatSar(rental.platformFeeHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">VAT (15%)</span>
                  <span>{formatSar(rental.vatHalalas)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>{formatSar(rental.totalPayableHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {legal && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <FileSignature className="w-4 h-4" /> Legal commitment
                </h2>
                <div className="space-y-2 text-sm">
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
                      <span>{new Date(legal.signedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {sanad && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Sanad (promissory note)
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Status</span>
                    <Badge variant="outline">{sanad.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Principal</span>
                    <span>{formatSar(sanad.principalHalalas)}</span>
                  </div>
                  {sanad.nafithReference && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Nafith ref</span>
                      <span className="font-mono text-xs">{sanad.nafithReference}</span>
                    </div>
                  )}
                  {sanad.maturityDate && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Maturity</span>
                      <span>{sanad.maturityDate}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {payments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Payment history
                </h2>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{p.type.replace(/_/g, " ")}</span>
                        <span className="text-neutral-500 ml-2 text-xs">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                        <Badge variant="outline" className="text-xs">
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
          {needsSigning && (
            <Card className="border-amber-300 bg-amber-50/40">
              <CardContent className="p-6">
                <FileSignature className="w-8 h-8 text-amber-600 mb-3" />
                <p className="font-semibold text-amber-900 mb-2">Action required</p>
                <p className="text-sm text-amber-800 mb-4">
                  Review and sign the legal commitment to proceed.
                </p>
                <Button
                  onClick={() => navigate(`/legal/${legal!.id}`)}
                  className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  Sign contract
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm mb-3">Timeline</h3>
              <div className="space-y-3">
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

          {DISPUTABLE.includes(rental.status) && !showDispute && (
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setShowDispute(true)}
            >
              <Gavel className="w-4 h-4 mr-2" /> Open dispute
            </Button>
          )}

          {showDispute && (
            <Card className="border-red-200">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-red-600" /> File a dispute
                </h3>
                <Select
                  value={disputeCategory}
                  onValueChange={(v) => setDisputeCategory(v as DisputeCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="service">Service issue</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Describe the issue in detail (min 10 characters)..."
                  value={disputeSummary}
                  onChange={(e) => setDisputeSummary(e.target.value)}
                  rows={4}
                />
                {disputeError && (
                  <p className="text-sm text-red-600">{disputeError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleOpenDispute}
                    disabled={disputeSubmitting || disputeSummary.length < 10}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white"
                  >
                    {disputeSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDispute(false);
                      setDisputeError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rental.status === "in_dispute" && (
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="font-semibold text-red-900 text-sm">Dispute active</p>
                </div>
                <p className="text-sm text-red-800">
                  This rental is under dispute review. You will be notified once the case is resolved.
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/my-rentals")}
          >
            Back to rentals
          </Button>
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
  date?: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {done ? (
        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 shrink-0" />
      )}
      <span className={done ? "font-medium" : "text-neutral-400"}>{label}</span>
      {date && (
        <span className="text-xs text-neutral-500 ml-auto">
          {new Date(date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
