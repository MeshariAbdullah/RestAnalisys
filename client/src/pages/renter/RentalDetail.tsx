import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Shield,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  rentalsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const CANCELLABLE = ["draft", "pending_legal", "pending_payment"];

function statusColor(s: string): string {
  if (s.includes("closed") && !s.includes("penalty")) return "bg-green-100 text-green-700";
  if (s.includes("penalty") || s === "disputed" || s === "cancelled")
    return "bg-red-100 text-red-700";
  if (s.includes("pending") || s.includes("awaiting") || s === "under_inspection")
    return "bg-amber-100 text-amber-800";
  if (s === "confirmed" || s === "delivered" || s === "in_use" || s === "returned")
    return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}

function sanadStatusColor(s: string): string {
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "discharged") return "bg-neutral-200 text-neutral-700";
  if (s === "under_execution" || s === "defaulted") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

function paymentStatusColor(s: string): string {
  if (s === "captured" || s === "settled") return "bg-green-100 text-green-700";
  if (s === "refunded") return "bg-amber-100 text-amber-800";
  if (s === "failed") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await rentalsApi.cancel(id, cancelReason);
      toast({ title: "Rental cancelled", variant: "success" });
      setShowCancel(false);
      setCancelReason("");
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({
        title: "Failed to cancel",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-300" />
            <p>{(error as Error)?.message ?? "Rental not found."}</p>
            <Link href="/my-rentals">
              <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Back to rentals
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = CANCELLABLE.includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </a>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental #{rental.id}</h1>
          <div className="mt-2">
            <Badge className={`border-0 ${statusColor(rental.status)}`}>
              {rental.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500 uppercase">Total</p>
          <p className="text-2xl font-bold">{formatSar(rental.totalPayableHalalas)}</p>
        </div>
      </div>

      {/* Rental details */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" /> Rental details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Start date</p>
              <p className="font-medium">{rental.startDate}</p>
            </div>
            <div>
              <p className="text-neutral-500">End date</p>
              <p className="font-medium">{rental.endDate}</p>
            </div>
            <div>
              <p className="text-neutral-500">Duration</p>
              <p className="font-medium">{rental.durationDays} days</p>
            </div>
            <div>
              <p className="text-neutral-500">Daily rate</p>
              <p className="font-medium">{formatSar(rental.dailyPriceHalalas)}</p>
            </div>
          </div>
          <div className="border-t mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal</span>
              <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Platform fee</span>
              <span>{formatSar(rental.platformFeeHalalas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">VAT 15%</span>
              <span>{formatSar(rental.vatHalalas)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total payable</span>
              <span>{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-neutral-500">
            Legal commitment: {formatSar(rental.legalCommitmentHalalas)} ({rental.legalCommitmentPct}%)
          </div>
        </CardContent>
      </Card>

      {/* Legal commitment */}
      {legal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4" /> Legal commitment
            </h2>
            <div className="flex items-center gap-3 mb-4 text-sm">
              <Badge className={`border-0 ${legal.signedAt ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                {legal.signedAt ? "Signed" : legal.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-neutral-500">
                Contract v{legal.contractVersion}
              </span>
              {legal.signedAt && (
                <span className="text-neutral-500">
                  Signed {new Date(legal.signedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="text-sm text-neutral-500 mb-3">
              Commitment amount: {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
            </div>
            {legal.clausesJson && legal.clausesJson.length > 0 && (
              <div className="border rounded-lg p-4 bg-neutral-50 space-y-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Contract clauses</p>
                {legal.clausesJson.map((clause) => (
                  <div key={clause.id} className="text-sm">
                    <p className="font-medium">{clause.titleEn}</p>
                    <p className="text-neutral-500 text-xs mt-0.5">{clause.bodyEn}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" /> Nafith Sanad
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`border-0 ${sanadStatusColor(sanad.status)}`}>
                {sanad.status.replace(/_/g, " ")}
              </Badge>
              {sanad.nafithReference && (
                <span className="text-sm text-neutral-500 font-mono">
                  Ref: {sanad.nafithReference}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Principal</p>
                <p className="font-medium">{formatSar(sanad.principalHalalas)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Due amount</p>
                <p className="font-medium">{formatSar(sanad.dueHalalas)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Maturity</p>
                <p className="font-medium">{sanad.maturityDate}</p>
              </div>
            </div>
            {sanad.executionCaseNumber && (
              <p className="mt-3 text-sm text-red-600">
                Execution case: {sanad.executionCaseNumber}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4" /> Payments
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-500">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Invoice</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: Payment) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3">{p.type}</td>
                      <td className="p-3 font-mono">{formatSar(p.amountHalalas)}</td>
                      <td className="p-3">
                        <Badge className={`border-0 text-xs ${paymentStatusColor(p.status)}`}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-neutral-500 font-mono text-xs">
                        {p.invoiceNumber ?? "—"}
                      </td>
                      <td className="p-3 text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel action */}
      {canCancel && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            {!showCancel ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel this rental
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-red-700">
                  Are you sure? This action cannot be undone.
                </p>
                <div>
                  <Label className="text-xs">Cancellation reason</Label>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Why are you cancelling?"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    disabled={cancelling || cancelReason.trim().length < 3}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {cancelling ? "Cancelling…" : "Confirm cancellation"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancel(false);
                      setCancelReason("");
                    }}
                  >
                    Keep rental
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
