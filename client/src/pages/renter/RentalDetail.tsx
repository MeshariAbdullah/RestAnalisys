import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FileSignature,
  CreditCard,
  Shield,
  Calendar,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar } from "@/lib/api";

function statusColor(s: string): string {
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "closed") return "bg-green-100 text-green-700";
  if (s === "cancelled") return "bg-neutral-200 text-neutral-600";
  if (s.includes("enforcement") || s.includes("dispute"))
    return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading || !data) return <div className="p-8">Loading rental…</div>;

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <FileText className="w-4 h-4" />
        Rental {rental.reference}
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Rental details</h1>
        <Badge className={`border-0 text-sm px-3 py-1 ${statusColor(rental.status)}`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Period</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-medium">
                  {rental.startDate} → {rental.endDate}
                </span>
              </div>
              <p className="text-neutral-500 mt-0.5">{rental.durationDays} days</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Daily rate</p>
              <p className="font-bold text-lg">{formatSar(rental.dailyPriceHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Total paid</p>
              <p className="font-bold text-lg text-amber-600">
                {formatSar(rental.totalPayableHalalas)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Commitment</p>
              <p className="font-bold text-lg">
                {formatSar(rental.legalCommitmentHalalas)}
              </p>
              <p className="text-neutral-500 text-xs">{rental.legalCommitmentPct}% of value</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mt-6 pt-6 border-t">
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Subtotal</p>
              <p className="font-medium">{formatSar(rental.rentalSubtotalHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Platform fee</p>
              <p className="font-medium">{formatSar(rental.platformFeeHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">VAT (15%)</p>
              <p className="font-medium">{formatSar(rental.vatHalalas)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Trust score</p>
              <p className="font-medium">{rental.trustScoreAtBooking ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Legal commitment */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">Legal commitment</h2>
            </div>
            {legal ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge
                    className={`border-0 ${
                      legal.status === "signed"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {legal.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Contract version</span>
                  <span className="font-mono">{legal.contractVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Commitment</span>
                  <span className="font-medium">
                    {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                  </span>
                </div>
                {legal.signedAt && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Signed at</span>
                    <span>{new Date(legal.signedAt).toLocaleString()}</span>
                  </div>
                )}
                {legal.status === "pending_signature" && (
                  <Link href={`/legal/${legal.id}`}>
                    <Button className="w-full mt-3 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                      Sign contract
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No legal commitment yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Sanad */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">Sanad (promissory note)</h2>
            </div>
            {sanad ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <Badge
                    className={`border-0 ${
                      sanad.status === "discharged"
                        ? "bg-green-100 text-green-700"
                        : sanad.status === "under_execution"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {sanad.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Nafith ref</span>
                  <span className="font-mono text-xs">{sanad.nafithReference ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Principal</span>
                  <span className="font-medium">{formatSar(sanad.principalHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Due amount</span>
                  <span className="font-medium">{formatSar(sanad.dueHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Maturity</span>
                  <span>{sanad.maturityDate}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Sanad will be issued upon contract signing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold">Payments</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-neutral-500">No payments recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Gateway</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3">
                        <Badge variant="outline">{p.type}</Badge>
                      </td>
                      <td className="p-3 font-medium">{formatSar(p.amountHalalas)}</td>
                      <td className="p-3">
                        <Badge
                          className={`border-0 ${
                            p.status === "captured"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs">{p.gateway}</td>
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

      <div className="mt-6">
        <Link href="/my-rentals">
          <Button variant="outline">Back to my rentals</Button>
        </Link>
      </div>
    </div>
  );
}
