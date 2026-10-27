import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileSignature,
  Gavel,
  Package,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar } from "@/lib/api";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "secondary"> = {
  draft: "secondary",
  pending_payment: "warning",
  confirmed: "default",
  in_fulfillment: "default",
  out_for_delivery: "default",
  delivered: "success",
  in_use: "success",
  awaiting_return: "warning",
  returned: "success",
  inspection_post_return: "warning",
  closed_clean: "success",
  closed_with_penalty: "error",
  disputed: "error",
  cancelled: "secondary",
};

function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "secondary";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="text-neutral-600">Failed to load rental details.</p>
        <Link href="/my-rentals">
          <Button variant="outline" className="mt-4">Back to My Rentals</Button>
        </Link>
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to My Rentals
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Rental Details</h1>
          <p className="font-mono text-sm text-neutral-500 mt-1">{rental.reference}</p>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {/* Rental Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            Rental Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Start Date</p>
              <p className="font-medium">{rental.startDate}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">End Date</p>
              <p className="font-medium">{rental.endDate}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Duration</p>
              <p className="font-medium">{rental.durationDays} days</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Status</p>
              <StatusBadge status={rental.status} />
            </div>
          </div>

          <div className="border-t mt-6 pt-6">
            <h3 className="text-sm font-semibold mb-3 text-neutral-700">Pricing Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Daily Rate</span>
                <span>{formatSar(rental.dailyPriceHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal ({rental.durationDays} days)</span>
                <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Platform Fee</span>
                <span>{formatSar(rental.platformFeeHalalas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">VAT (15%)</span>
                <span>{formatSar(rental.vatHalalas)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Payable</span>
                <span>{formatSar(rental.totalPayableHalalas)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Commitment */}
      {legal && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-amber-600" />
              Legal Commitment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Status</p>
                <Badge variant={legal.status === "signed" ? "success" : "warning"}>
                  {legal.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Commitment Amount</p>
                <p className="font-medium">{formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)</p>
              </div>
              {legal.signedAt && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Signed At</p>
                  <p className="font-medium">{new Date(legal.signedAt).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-neutral-500 uppercase">Contract Version</p>
                <p className="font-medium">{legal.contractVersion}</p>
              </div>
            </div>
            {legal.clausesJson && legal.clausesJson.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2 text-neutral-700">Clauses</h4>
                <div className="space-y-2">
                  {legal.clausesJson.map((clause) => (
                    <div key={clause.id} className="text-sm p-3 bg-neutral-50 rounded-lg">
                      <p className="font-medium">{clause.titleEn}</p>
                      <p className="text-neutral-500 mt-1">{clause.bodyEn}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sanad */}
      {sanad && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gavel className="w-5 h-5 text-amber-600" />
              Sanad (Promissory Note)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase">Status</p>
                <Badge variant={sanad.status === "active" ? "success" : sanad.status === "under_execution" ? "error" : "secondary"}>
                  {sanad.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {sanad.nafithReference && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Nafith / MOJ Reference</p>
                  <p className="font-mono font-medium">{sanad.nafithReference}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-neutral-500 uppercase">Principal</p>
                <p className="font-medium">{formatSar(sanad.principalHalalas)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Due Amount</p>
                <p className="font-medium">{formatSar(sanad.dueHalalas)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase">Maturity Date</p>
                <p className="font-medium">{sanad.maturityDate}</p>
              </div>
              {sanad.executionCaseNumber && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Execution Case</p>
                  <p className="font-mono font-medium">{sanad.executionCaseNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-4">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-neutral-500">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Type</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 capitalize">{p.type.replace(/_/g, " ")}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            p.status === "captured" || p.status === "completed"
                              ? "success"
                              : p.status === "failed"
                              ? "error"
                              : "warning"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono">{formatSar(p.amountHalalas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
