import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  FileText,
  CreditCard,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

const LIFECYCLE_STEPS = [
  "pending_legal_signing",
  "pending_payment",
  "confirmed",
  "out_for_delivery",
  "active",
  "return_in_transit",
  "under_inspection",
  "closed",
];

function lifecycleProgress(status: string): number {
  const idx = LIFECYCLE_STEPS.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / LIFECYCLE_STEPS.length) * 100);
}

export default function RentalDetail({ id }: { id: number }) {
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Rentals
        </a>
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-2xl font-bold mt-1">Rental Details</h1>
        </div>
        <Badge
          className={`text-sm px-3 py-1 ${
            rental.status === "closed"
              ? "bg-green-100 text-green-700"
              : rental.status === "cancelled"
              ? "bg-neutral-200 text-neutral-600"
              : rental.status === "enforcement" || rental.status === "in_dispute"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Progress tracker */}
      {!["cancelled", "enforcement", "in_dispute"].includes(rental.status) && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Rental Progress</p>
              <p className="text-xs text-neutral-500">
                {rental.status.replace(/_/g, " ")}
              </p>
            </div>
            <Progress value={lifecycleProgress(rental.status)} className="h-2" />
            <div className="flex justify-between mt-2 text-[10px] text-neutral-400">
              <span>Signing</span>
              <span>Payment</span>
              <span>Delivery</span>
              <span>Active</span>
              <span>Return</span>
              <span>Closed</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Rental summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-neutral-600" />
              <h2 className="font-semibold">Rental Summary</h2>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Period" value={`${rental.startDate} → ${rental.endDate}`} />
              <Row label="Duration" value={`${rental.durationDays} days`} />
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-2 mt-2">
                <Row label="Total" value={formatSar(rental.totalPayableHalalas)} bold />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal commitment */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-neutral-600" />
              <h2 className="font-semibold">Legal Commitment</h2>
            </div>
            {legal ? (
              <div className="space-y-2 text-sm">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row label="Commitment" value={formatSar(legal.commitmentHalalas)} />
                <Row label="Rate" value={`${legal.commitmentPct}%`} />
                <Row label="Contract" value={legal.contractVersion} />
                {legal.signedAt && (
                  <Row label="Signed" value={new Date(legal.signedAt).toLocaleDateString()} />
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment on file.</p>
            )}
          </CardContent>
        </Card>

        {/* Sanad */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-neutral-600" />
              <h2 className="font-semibold">Sanad (Promissory Note)</h2>
            </div>
            {sanad ? (
              <div className="space-y-2 text-sm">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due amount" value={formatSar(sanad.dueHalalas)} />
                {sanad.nafithReference && (
                  <Row label="Nafith ref" value={sanad.nafithReference} />
                )}
                {sanad.maturityDate && (
                  <Row label="Maturity" value={sanad.maturityDate} />
                )}
                {sanad.executionCaseNumber && (
                  <Row label="Execution case" value={sanad.executionCaseNumber} />
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No Sanad issued for this rental.</p>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-neutral-600" />
              <h2 className="font-semibold">Payments</h2>
            </div>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((p: Payment) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{p.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-neutral-500">
                        {p.capturedAt
                          ? new Date(p.capturedAt).toLocaleDateString()
                          : p.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatSar(p.amountHalalas)}</p>
                      <Badge
                        className={`text-[10px] ${
                          p.status === "captured"
                            ? "bg-green-100 text-green-700"
                            : p.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No payments recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timestamps */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-3">Timeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <TimelineItem
              label="Created"
              date={rental.createdAt}
              icon={<Clock className="w-4 h-4" />}
            />
            {rental.confirmedAt && (
              <TimelineItem
                label="Confirmed"
                date={rental.confirmedAt}
                icon={<CheckCircle className="w-4 h-4 text-green-600" />}
              />
            )}
            {rental.deliveredAt && (
              <TimelineItem
                label="Delivered"
                date={rental.deliveredAt}
                icon={<Package className="w-4 h-4 text-blue-600" />}
              />
            )}
            {rental.returnedAt && (
              <TimelineItem
                label="Returned"
                date={rental.returnedAt}
                icon={<CheckCircle className="w-4 h-4 text-green-600" />}
              />
            )}
            {rental.closedAt && (
              <TimelineItem
                label="Closed"
                date={rental.closedAt}
                icon={<CheckCircle className="w-4 h-4 text-green-600" />}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {disputeError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mt-4">
          {disputeError}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  icon,
}: {
  label: string;
  date: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-medium">
          {new Date(date).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
