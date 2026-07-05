import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Shield,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, formatSar } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending_risk_review: "bg-amber-100 text-amber-800",
  pending_legal_signing: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  return_in_transit: "bg-blue-100 text-blue-700",
  under_inspection: "bg-amber-100 text-amber-800",
  closed: "bg-green-100 text-green-700",
  closed_with_penalty: "bg-red-100 text-red-700",
  cancelled: "bg-neutral-200 text-neutral-600",
  in_dispute: "bg-red-100 text-red-700",
  enforcement: "bg-red-100 text-red-700",
};

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });
  const qc = useQueryClient();

  async function handleCancel() {
    if (!confirm("Cancel this rental?")) return;
    await rentalsApi.cancel(id, "Cancelled by renter");
    qc.invalidateQueries({ queryKey: ["rental", id] });
  }

  if (isLoading || !data) return <div className="p-8">Loading...</div>;

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/my-rentals">
        <a className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to my rentals
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={STATUS_COLORS[rental.status] ?? "bg-neutral-200 text-neutral-700"}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Rental info
            </h2>
            <dl className="space-y-3 text-sm">
              <Row label="Period" value={`${rental.startDate} to ${rental.endDate}`} />
              <Row label="Duration" value={`${rental.durationDays} days`} />
              <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
              <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
              <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
              <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
              <div className="border-t pt-3">
                <Row label="Total" value={formatSar(rental.totalPayableHalalas)} bold />
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Legal commitment
            </h2>
            {legal ? (
              <dl className="space-y-3 text-sm">
                <Row label="Status" value={legal.status.replace(/_/g, " ")} />
                <Row
                  label="Commitment"
                  value={`${formatSar(legal.commitmentHalalas)} (${legal.commitmentPct}%)`}
                />
                <Row label="Contract version" value={legal.contractVersion} />
                {legal.signedAt && <Row label="Signed" value={new Date(legal.signedAt).toLocaleString()} />}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment yet</p>
            )}
          </CardContent>
        </Card>

        {sanad && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Sanad (Promissory note)
              </h2>
              <dl className="space-y-3 text-sm">
                <Row label="Status" value={sanad.status.replace(/_/g, " ")} />
                <Row label="Nafith ref" value={sanad.nafithReference ?? "-"} />
                <Row label="Principal" value={formatSar(sanad.principalHalalas)} />
                <Row label="Due" value={formatSar(sanad.dueHalalas)} />
                <Row label="Maturity" value={sanad.maturityDate} />
              </dl>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Payments
            </h2>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{p.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatSar(p.amountHalalas)}</p>
                      <Badge
                        className={
                          p.status === "captured"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No payments recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 mt-6 flex-wrap">
        <TimelineStep
          label="Created"
          date={rental.createdAt}
          done
        />
        <TimelineStep
          label="Confirmed"
          date={rental.confirmedAt}
          done={!!rental.confirmedAt}
        />
        <TimelineStep
          label="Delivered"
          date={rental.deliveredAt}
          done={!!rental.deliveredAt}
        />
        <TimelineStep
          label="Returned"
          date={rental.returnedAt}
          done={!!rental.returnedAt}
        />
        <TimelineStep
          label="Closed"
          date={rental.closedAt}
          done={!!rental.closedAt}
        />
      </div>

      {["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(
        rental.status
      ) && (
        <div className="mt-6">
          <Button variant="outline" className="text-red-600" onClick={handleCancel}>
            Cancel rental
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function TimelineStep({
  label,
  date,
  done,
}: {
  label: string;
  date?: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <Clock className="w-4 h-4 text-neutral-300" />
      )}
      <div>
        <p className={done ? "font-medium" : "text-neutral-400"}>{label}</p>
        {date && (
          <p className="text-xs text-neutral-500">
            {new Date(date).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
