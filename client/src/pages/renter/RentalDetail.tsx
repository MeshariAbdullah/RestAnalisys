import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  FileText,
  CreditCard,
  Scale,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  rentalsApi,
  disputesApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";

function statusColor(status: string): string {
  if (status.startsWith("closed") || status === "completed") return "bg-green-100 text-green-800";
  if (status === "cancelled" || status === "enforcement") return "bg-red-100 text-red-800";
  if (status === "active" || status === "confirmed") return "bg-blue-100 text-blue-800";
  if (status === "in_dispute") return "bg-orange-100 text-orange-800";
  return "bg-neutral-100 text-neutral-700";
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("damage");
  const [disputeSummary, setDisputeSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rental-detail", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function handleOpenDispute() {
    if (!disputeSummary.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      });
      setShowDisputeForm(false);
      setDisputeSummary("");
      await qc.invalidateQueries({ queryKey: ["rental-detail", id] });
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to my rentals
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
          <h1 className="text-3xl font-bold mt-1">Rental details</h1>
        </div>
        <Badge className={`${statusColor(rental.status)} border-0 text-sm px-3 py-1`}>
          {rental.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase">Period</p>
            <p className="font-semibold mt-1">{rental.startDate} → {rental.endDate}</p>
            <p className="text-sm text-neutral-500">{rental.durationDays} days</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Total paid</p>
            <p className="font-bold text-lg mt-1">{formatSar(rental.totalPayableHalalas)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Commitment</p>
            <p className="font-semibold mt-1">{formatSar(rental.legalCommitmentHalalas)}</p>
            <p className="text-sm text-neutral-500">{rental.legalCommitmentPct}% of value</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Trust score</p>
            <p className="font-semibold mt-1">{rental.trustScoreAtBooking ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="timeline">
            <Clock className="w-4 h-4 mr-1" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="legal">
            <FileText className="w-4 h-4 mr-1" /> Legal
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-1" /> Payments
          </TabsTrigger>
          <TabsTrigger value="dispute">
            <Scale className="w-4 h-4 mr-1" /> Dispute
          </TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Lifecycle events</h3>
              <div className="space-y-3">
                <TimelineItem label="Created" date={rental.createdAt} done />
                <TimelineItem label="Confirmed" date={rental.confirmedAt} done={!!rental.confirmedAt} />
                <TimelineItem label="Delivered" date={rental.deliveredAt} done={!!rental.deliveredAt} />
                <TimelineItem label="Returned" date={rental.returnedAt} done={!!rental.returnedAt} />
                <TimelineItem label="Closed" date={rental.closedAt} done={!!rental.closedAt} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal */}
        <TabsContent value="legal">
          <div className="space-y-4">
            {legal ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Contract</h3>
                    <Badge className={legal.signedAt ? "bg-green-100 text-green-800 border-0" : "bg-amber-100 text-amber-800 border-0"}>
                      {legal.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">Version:</span> {legal.contractVersion}
                    </div>
                    <div>
                      <span className="text-neutral-500">Commitment:</span> {formatSar(legal.commitmentHalalas)} ({legal.commitmentPct}%)
                    </div>
                    {legal.signedAt && (
                      <div className="col-span-2">
                        <span className="text-neutral-500">Signed:</span> {new Date(legal.signedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {legal.status === "pending_signature" && (
                    <Button
                      onClick={() => navigate(`/legal/${legal.id}`)}
                      className="mt-4 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    >
                      Sign contract
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-neutral-500">
                  No legal commitment on record.
                </CardContent>
              </Card>
            )}

            {sanad && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Sanad (Promissory note)</h3>
                    <Badge className="bg-neutral-100 text-neutral-700 border-0">
                      {sanad.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-neutral-500">Nafith ref:</span> {sanad.nafithReference ?? "—"}
                    </div>
                    <div>
                      <span className="text-neutral-500">Principal:</span> {formatSar(sanad.principalHalalas)}
                    </div>
                    <div>
                      <span className="text-neutral-500">Due:</span> {formatSar(sanad.dueHalalas)}
                    </div>
                    <div>
                      <span className="text-neutral-500">Maturity:</span> {sanad.maturityDate ?? "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-6">
              {payments.length === 0 ? (
                <p className="text-center text-neutral-500 py-4">No payments recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-neutral-500 border-b">
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: Payment) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2 capitalize">{p.type.replace(/_/g, " ")}</td>
                          <td className="py-2 font-medium">{formatSar(p.amountHalalas)}</td>
                          <td className="py-2">
                            <Badge className={
                              p.status === "captured" ? "bg-green-100 text-green-800 border-0" :
                              p.status === "failed" ? "bg-red-100 text-red-800 border-0" :
                              "bg-neutral-100 text-neutral-700 border-0"
                            }>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 text-neutral-500">{p.invoiceNumber ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispute */}
        <TabsContent value="dispute">
          <Card>
            <CardContent className="p-6">
              {!showDisputeForm ? (
                <div className="text-center py-4">
                  <Flag className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
                  <p className="text-neutral-600 mb-4">
                    Have an issue with this rental? You can open a dispute and our team will investigate.
                  </p>
                  <Button
                    onClick={() => setShowDisputeForm(true)}
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Open a dispute
                  </Button>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold mb-4">Open a dispute</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={disputeCategory}
                      onChange={(e) => setDisputeCategory(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="damage">Damage</option>
                      <option value="loss">Loss</option>
                      <option value="fraud">Fraud</option>
                      <option value="service">Service issue</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={disputeSummary}
                      onChange={(e) => setDisputeSummary(e.target.value)}
                      rows={4}
                      placeholder="Describe the issue in detail..."
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {error && (
                    <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleOpenDispute}
                      disabled={submitting || !disputeSummary.trim()}
                      className="bg-red-600 hover:bg-red-500 text-white"
                    >
                      {submitting ? "Submitting..." : "Submit dispute"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDisputeForm(false);
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineItem({ label, date, done }: { label: string; date?: string | null; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-neutral-300 shrink-0" />
      )}
      <span className={`font-medium ${done ? "text-neutral-900" : "text-neutral-400"}`}>{label}</span>
      {date && (
        <span className="text-xs text-neutral-500 ml-auto">
          {new Date(date).toLocaleString()}
        </span>
      )}
    </div>
  );
}
