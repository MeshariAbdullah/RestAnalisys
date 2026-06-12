import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Shield,
  FileText,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Truck,
  XCircle,
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
  { color: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Risk Review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText, label: "Awaiting Signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting Payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Truck, label: "Out for Delivery" },
  active: { color: "bg-green-100 text-green-700", icon: Package, label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Truck, label: "Return in Transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under Inspection" },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Closed" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Closed (Penalty)" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: Gavel, label: "In Dispute" },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle, label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { color: "bg-neutral-200 text-neutral-700", icon: Clock, label: status };
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} hover:${config.color} border-0 text-sm px-3 py-1`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {config.label}
    </Badge>
  );
}

interface TimelineStep {
  label: string;
  date?: string | null;
  active: boolean;
  completed: boolean;
}

function buildTimeline(rental: Rental): TimelineStep[] {
  const steps: TimelineStep[] = [
    { label: "Created", date: rental.createdAt, active: false, completed: true },
    { label: "Confirmed", date: rental.confirmedAt, active: rental.status === "confirmed", completed: !!rental.confirmedAt },
    { label: "Delivered", date: rental.deliveredAt, active: rental.status === "active", completed: !!rental.deliveredAt },
    { label: "Returned", date: rental.returnedAt, active: rental.status === "under_inspection", completed: !!rental.returnedAt },
    { label: "Closed", date: rental.closedAt, active: false, completed: !!rental.closedAt },
  ];
  return steps;
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeMode, setDisputeMode] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("damage");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const canCancel =
    data?.rental &&
    ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(data.rental.status);

  const canDispute =
    data?.rental &&
    ["active", "under_inspection", "closed_with_penalty"].includes(data.rental.status);

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await rentalsApi.cancel(id, cancelReason);
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      setCancelMode(false);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenDispute() {
    if (!disputeSummary.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      });
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      setDisputeMode(false);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded mb-4" />
        <div className="h-64 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-red-600">Failed to load rental details.</p>
        <Button variant="outline" onClick={() => navigate("/my-rentals")} className="mt-4">
          Back to My Rentals
        </Button>
      </div>
    );
  }

  const { rental, legal, sanad, payments: paymentsList } = data;
  const timeline = buildTimeline(rental);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Rentals
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental Details</h1>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Timeline</h2>
          <div className="flex items-center gap-0">
            {timeline.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? "bg-green-500 text-white"
                        : step.active
                        ? "bg-amber-500 text-white"
                        : "bg-neutral-200 text-neutral-400"
                    }`}
                  >
                    {step.completed ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <p className="text-xs mt-1.5 text-center font-medium">{step.label}</p>
                  {step.date && (
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {new Date(step.date).toLocaleDateString("en-SA")}
                    </p>
                  )}
                </div>
                {i < timeline.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mt-[-20px] ${
                      step.completed ? "bg-green-400" : "bg-neutral-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rental Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Rental Period
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Start date</span>
                <span className="font-medium">{rental.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">End date</span>
                <span className="font-medium">{rental.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Duration</span>
                <span className="font-medium">{rental.durationDays} days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pricing
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Daily price</span>
                <span>{formatSar(rental.dailyPriceHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
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
              <hr />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Commitment */}
        {legal && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Legal Commitment
              </h2>
              <div className="space-y-3 text-sm">
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
                <div className="flex justify-between">
                  <span className="text-neutral-500">Signed</span>
                  <span>
                    {legal.signedAt
                      ? new Date(legal.signedAt).toLocaleDateString("en-SA")
                      : "Not yet"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Contract version</span>
                  <span>{legal.contractVersion}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sanad */}
        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Sanad (Promissory Note)
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge variant="outline">{sanad.status.replace(/_/g, " ")}</Badge>
                </div>
                {sanad.nafithReference && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Nafith ref</span>
                    <span className="font-mono text-xs">{sanad.nafithReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Principal</span>
                  <span>{formatSar(sanad.principalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Maturity</span>
                  <span>{sanad.maturityDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payments */}
      {paymentsList && paymentsList.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </h2>
            <div className="space-y-3">
              {paymentsList.map((p: Payment) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border-b border-neutral-100 pb-3"
                >
                  <div>
                    <span className="font-medium capitalize">{p.type.replace(/_/g, " ")}</span>
                    <span className="text-neutral-400 ml-2 text-xs">
                      {new Date(p.createdAt).toLocaleDateString("en-SA")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "captured"
                          ? "border-green-300 text-green-700"
                          : p.status === "failed"
                          ? "border-red-300 text-red-700"
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

      {/* Actions */}
      <div className="mt-6 space-y-4">
        {actionError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {actionError}
          </div>
        )}

        {canCancel && !cancelMode && (
          <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setCancelMode(true)}>
            <XCircle className="w-4 h-4 mr-2" />
            Cancel Rental
          </Button>
        )}

        {cancelMode && (
          <Card className="border-red-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-red-700 mb-3">Cancel this rental?</h3>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={3}
              />
              <div className="flex gap-3 mt-3">
                <Button
                  onClick={handleCancel}
                  disabled={actionLoading || !cancelReason.trim()}
                  className="bg-red-600 text-white hover:bg-red-500"
                >
                  {actionLoading ? "Cancelling..." : "Confirm Cancel"}
                </Button>
                <Button variant="outline" onClick={() => setCancelMode(false)}>
                  Keep Rental
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {canDispute && !disputeMode && (
          <Button variant="outline" onClick={() => setDisputeMode(true)}>
            <Gavel className="w-4 h-4 mr-2" />
            Open Dispute
          </Button>
        )}

        {disputeMode && (
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Open a dispute</h3>
              <div className="space-y-3">
                <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
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
                  value={disputeSummary}
                  onChange={(e) => setDisputeSummary(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleOpenDispute}
                    disabled={actionLoading || !disputeSummary.trim()}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {actionLoading ? "Submitting..." : "Submit Dispute"}
                  </Button>
                  <Button variant="outline" onClick={() => setDisputeMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
