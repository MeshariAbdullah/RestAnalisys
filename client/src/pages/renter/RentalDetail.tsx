import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, FileText, Shield, CreditCard, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar } from "@/lib/api";

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

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-96 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
        Rental not found.
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const statusColor = STATUS_COLORS[rental.status] ?? "bg-neutral-200 text-neutral-700";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-sm text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge className={`${statusColor} border-0 text-sm px-3 py-1`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Schedule
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Start date</dt>
                <dd className="font-medium">{rental.startDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">End date</dt>
                <dd className="font-medium">{rental.endDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Duration</dt>
                <dd className="font-medium">{rental.durationDays} days</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Pricing
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Daily rate</dt>
                <dd className="font-medium">{formatSar(rental.dailyPriceHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd className="font-medium">{formatSar(rental.rentalSubtotalHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Platform fee</dt>
                <dd className="font-medium">{formatSar(rental.platformFeeHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">VAT (15%)</dt>
                <dd className="font-medium">{formatSar(rental.vatHalalas)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 mt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold text-lg">{formatSar(rental.totalPayableHalalas)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {legal && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Legal Commitment
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Status</dt>
                <dd>
                  <Badge variant="outline">{legal.status.replace(/_/g, " ")}</Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Commitment</dt>
                <dd className="font-medium">
                  {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                </dd>
              </div>
              {legal.signedAt && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Signed</dt>
                  <dd className="font-medium">
                    {new Date(legal.signedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
            {legal.status === "pending_signature" && (
              <Link href={`/legal/${legal.id}`}>
                <Button className="mt-4 w-full" size="sm">
                  Sign commitment
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {sanad && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Sanad (Promissory Note)
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Status</dt>
                <dd>
                  <Badge variant="outline">{sanad.status.replace(/_/g, " ")}</Badge>
                </dd>
              </div>
              {sanad.nafithReference && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Nafith Ref</dt>
                  <dd className="font-mono text-xs">{sanad.nafithReference}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Principal</dt>
                <dd className="font-medium">{formatSar(sanad.principalHalalas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Maturity</dt>
                <dd className="font-medium">{sanad.maturityDate}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Payments
            </h2>
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium capitalize">{p.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(p.createdAt).toLocaleDateString()} via {p.gateway}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
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
  );
}
