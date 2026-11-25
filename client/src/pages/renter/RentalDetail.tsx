import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  FileText,
  CreditCard,
  Shield,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar, type Payment } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

const STATUS_META: Record<string, { color: string; icon: typeof Clock; label?: string }> = {
  draft: { color: "bg-neutral-200 text-neutral-700", icon: Clock },
  pending_payment: { color: "bg-amber-100 text-amber-800", icon: Clock },
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
  disputed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { color: "bg-neutral-200 text-neutral-600", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0 text-sm px-3 py-1`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const CANCELLABLE = ["draft", "pending_payment", "confirmed", "in_fulfillment"];

export default function RentalDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleCancel() {
    const reason = prompt("Reason for cancellation?");
    if (!reason) return;
    try {
      await rentalsApi.cancel(id, reason);
      toast({ title: "Rental cancelled" });
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-red-600">Failed to load rental details.</p>
        <Link href="/my-rentals" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
          ← Back to my rentals
        </Link>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = CANCELLABLE.includes(rental.status);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to my rentals
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental #{rental.id}</h1>
          <div className="mt-2">
            <StatusBadge status={rental.status} />
          </div>
        </div>
        {canCancel && (
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleCancel}>
            <XCircle className="w-4 h-4 mr-1.5" /> Cancel rental
          </Button>
        )}
      </div>

      {/* Price breakdown */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4" /> Price breakdown
          </h2>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-neutral-500">Period</span>
            <span className="text-right">{rental.startDate} → {rental.endDate} ({rental.durationDays} days)</span>
            <span className="text-neutral-500">Daily rate</span>
            <span className="text-right">{formatSar(rental.dailyPriceHalalas)}</span>
            <span className="text-neutral-500">Rental subtotal</span>
            <span className="text-right">{formatSar(rental.rentalSubtotalHalalas)}</span>
            <span className="text-neutral-500">Platform fee</span>
            <span className="text-right">{formatSar(rental.platformFeeHalalas)}</span>
            <span className="text-neutral-500">VAT (15%)</span>
            <span className="text-right">{formatSar(rental.vatHalalas)}</span>
            <span className="font-semibold border-t pt-3">Total payable</span>
            <span className="text-right font-bold text-lg border-t pt-3">{formatSar(rental.totalPayableHalalas)}</span>
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
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-neutral-500">Status</span>
              <span className="text-right capitalize">{legal.status.replace(/_/g, " ")}</span>
              <span className="text-neutral-500">Commitment amount</span>
              <span className="text-right font-semibold">{formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)</span>
              <span className="text-neutral-500">Contract version</span>
              <span className="text-right font-mono text-xs">{legal.contractVersion}</span>
              {legal.signedAt && (
                <>
                  <span className="text-neutral-500">Signed</span>
                  <span className="text-right">{new Date(legal.signedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
            {legal.status === "pending_signature" && (
              <Link href={`/legal/${legal.id}`}>
                <Button className="mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                  Sign commitment →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" /> Sanad (Promissory note)
            </h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-neutral-500">Status</span>
              <span className="text-right capitalize">{sanad.status.replace(/_/g, " ")}</span>
              <span className="text-neutral-500">Principal</span>
              <span className="text-right">{formatSar(sanad.principalHalalas)}</span>
              <span className="text-neutral-500">Amount due</span>
              <span className="text-right font-semibold">{formatSar(sanad.dueHalalas)}</span>
              <span className="text-neutral-500">Maturity date</span>
              <span className="text-right">{sanad.maturityDate}</span>
              {sanad.nafithReference && (
                <>
                  <span className="text-neutral-500">Nafith ref</span>
                  <span className="text-right font-mono text-xs">{sanad.nafithReference}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4" /> Payments
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: Payment) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 capitalize">{p.type.replace(/_/g, " ")}</td>
                      <td className="py-2">{formatSar(p.amountHalalas)}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {p.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2 text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
