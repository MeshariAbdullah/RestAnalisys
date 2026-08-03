import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Shield,
  FileText,
  CreditCard,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  rentalsApi,
  paymentsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const STATUS_META: Record<
  string,
  { color: string; icon: typeof Clock; label: string }
> = {
  pending_risk_review: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Risk Review" },
  pending_legal_signing: { color: "bg-amber-100 text-amber-800", icon: FileText, label: "Awaiting Signature" },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: CreditCard, label: "Awaiting Payment" },
  confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
  out_for_delivery: { color: "bg-blue-100 text-blue-700", icon: Package, label: "Out for Delivery" },
  active: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Active" },
  return_in_transit: { color: "bg-amber-100 text-amber-800", icon: Package, label: "Return In Transit" },
  under_inspection: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Under Inspection" },
  closed: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Closed (Clean)" },
  closed_with_penalty: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Closed (Penalty)" },
  in_dispute: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "In Dispute" },
  enforcement: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Enforcement" },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: AlertCircle, label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { color: "bg-neutral-200 text-neutral-700", icon: Clock, label: status };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {meta.label}
    </Badge>
  );
}

function TimelineStep({
  label,
  date,
  active,
  done,
}: {
  label: string;
  date?: string | null;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-3 h-3 rounded-full shrink-0 ${
          done ? "bg-green-500" : active ? "bg-amber-500 animate-pulse" : "bg-neutral-200"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? "text-neutral-900 font-medium" : "text-neutral-500"}`}>
          {label}
        </p>
        {date && (
          <p className="text-xs text-neutral-400">
            {new Date(date).toLocaleDateString("en-SA", { dateStyle: "medium" })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeSummary, setDisputeSummary] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handlePay() {
    setPaying(true);
    try {
      await paymentsApi.charge(id);
      toast({ title: "Payment captured", description: "Your rental is now confirmed.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({ title: "Payment failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await rentalsApi.cancel(id, cancelReason);
      toast({ title: "Rental cancelled", variant: "success" });
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({ title: "Cancel failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  }

  async function handleDispute() {
    setSubmittingDispute(true);
    try {
      await disputesApi.open({ rentalId: id, category: "service", summary: disputeSummary });
      toast({ title: "Dispute opened", description: "Our team will review your case.", variant: "success" });
      setDisputeOpen(false);
      setDisputeSummary("");
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({ title: "Failed to open dispute", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmittingDispute(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error || !data) return <div className="p-8">Rental not found.</div>;

  const { rental, legal, sanad, payments: paymentList } = data;

  const canPay = rental.status === "pending_payment";
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment", "confirmed"].includes(rental.status);
  const canDispute = ["active", "closed", "closed_with_penalty"].includes(rental.status);
  const canSign = rental.status === "pending_legal_signing" && legal;

  const steps = [
    { label: "Booked", date: rental.createdAt, done: true },
    { label: "Contract signed", date: legal?.signedAt, done: !!legal?.signedAt },
    { label: "Payment captured", date: rental.confirmedAt, done: !!rental.confirmedAt },
    { label: "Delivered", date: rental.deliveredAt, done: !!rental.deliveredAt },
    { label: "Returned", date: rental.returnedAt, done: !!rental.returnedAt },
    { label: "Closed", date: rental.closedAt, done: !!rental.closedAt },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate("/my-rentals")}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
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

      {/* Timeline */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Lifecycle
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <TimelineStep
                key={step.label}
                {...step}
                active={i === currentStep}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="legal">Legal & Sanad</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Period</p>
                    <p className="font-medium">
                      {rental.startDate} - {rental.endDate} ({rental.durationDays} days)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Daily rate</p>
                    <p className="font-medium">{formatSar(rental.dailyPriceHalalas)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Trust score at booking</p>
                    <p className="font-medium">{rental.trustScoreAtBooking ?? "N/A"}/100</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Subtotal</span>
                    <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Platform fee</span>
                    <span>{formatSar(rental.platformFeeHalalas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">VAT (15%)</span>
                    <span>{formatSar(rental.vatHalalas)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total payable</span>
                    <span>{formatSar(rental.totalPayableHalalas)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 pt-2">
                    <span>Legal commitment ({rental.legalCommitmentPct}%)</span>
                    <span className="font-semibold">{formatSar(rental.legalCommitmentHalalas)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardContent className="p-6 space-y-4">
              {legal ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Legal Commitment
                    </h3>
                    <Badge variant="outline">{legal.status}</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-neutral-500">Contract version</p>
                      <p>{legal.contractVersion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Commitment amount</p>
                      <p className="font-medium">{formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Signed at</p>
                      <p>{legal.signedAt ? new Date(legal.signedAt).toLocaleString() : "Not yet signed"}</p>
                    </div>
                  </div>
                  {legal.clausesJson && legal.clausesJson.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-amber-600 hover:underline">
                        View {legal.clausesJson.length} contract clauses
                      </summary>
                      <div className="mt-3 space-y-3">
                        {legal.clausesJson.map((c) => (
                          <div key={c.id} className="border rounded-md p-3">
                            <p className="font-medium">{c.titleEn}</p>
                            <p className="text-xs text-neutral-500 mb-1">{c.titleAr}</p>
                            <p className="text-neutral-600 text-xs">{c.bodyEn}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <p className="text-neutral-500 text-sm">No legal commitment on file yet.</p>
              )}

              {sanad && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Nafith Sanad
                    </h3>
                    <Badge variant="outline">{sanad.status}</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-xs text-neutral-500">Reference</p>
                      <p className="font-mono">{sanad.nafithReference ?? "Pending"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Principal</p>
                      <p>{formatSar(sanad.principalHalalas)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Due amount</p>
                      <p className="font-medium">{formatSar(sanad.dueHalalas)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Maturity date</p>
                      <p>{sanad.maturityDate}</p>
                    </div>
                    {sanad.executionCaseNumber && (
                      <div className="col-span-2">
                        <p className="text-xs text-neutral-500">Execution case</p>
                        <p className="text-red-600 font-mono">{sanad.executionCaseNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4" /> Payment History
              </h3>
              {paymentList.length === 0 ? (
                <p className="text-sm text-neutral-500">No payments recorded.</p>
              ) : (
                <div className="space-y-3">
                  {paymentList.map((p: Payment) => (
                    <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <p className="text-sm font-medium">{p.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-neutral-500">
                          {p.gateway} {p.gatewayTransactionId ? `· ${p.gatewayTransactionId}` : ""}
                        </p>
                        {p.invoiceNumber && (
                          <p className="text-xs text-neutral-400 mt-0.5">Invoice: {p.invoiceNumber}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatSar(p.amountHalalas)}</p>
                        <Badge
                          className={`text-xs ${
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : p.status === "refunded"
                              ? "bg-amber-100 text-amber-700"
                              : p.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-neutral-100 text-neutral-600"
                          } border-0`}
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canSign && (
          <Button
            onClick={() => navigate(`/legal/${legal!.id}`)}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            <FileText className="w-4 h-4 mr-2" /> Sign Contract
          </Button>
        )}
        {canPay && (
          <Button
            onClick={handlePay}
            disabled={paying}
            className="bg-green-600 text-white hover:bg-green-500"
          >
            <CreditCard className="w-4 h-4 mr-2" /> {paying ? "Processing..." : "Pay Now"}
          </Button>
        )}
        {canDispute && (
          <Button variant="outline" onClick={() => setDisputeOpen(true)}>
            <AlertCircle className="w-4 h-4 mr-2" /> Open Dispute
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
            Cancel Rental
          </Button>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Rental</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep Rental
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a Dispute</DialogTitle>
            <DialogDescription>
              Describe the issue you experienced. Our team will review and respond.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            value={disputeSummary}
            onChange={(e) => setDisputeSummary(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDispute}
              disabled={submittingDispute || !disputeSummary.trim()}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {submittingDispute ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
