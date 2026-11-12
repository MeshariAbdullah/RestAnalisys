import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  CreditCard,
  FileSignature,
  Gavel,
  Receipt,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  rentalsApi,
  formatSar,
  type Rental,
  type LegalCommitment,
  type SanadRecord,
  type Payment,
} from "@/lib/api";
import { formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${getStatusColor(status)} border-0`}>
      {getStatusLabel(status)}
    </Badge>
  );
}

function PricingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

interface TimelineEvent {
  key: string;
  label: string;
  date?: string;
  icon: React.ComponentType<{ className?: string }>;
}

function buildTimeline(rental: Rental): TimelineEvent[] {
  return [
    { key: "created", label: "Rental created", date: rental.createdAt, icon: Calendar },
    { key: "confirmed", label: "Confirmed", date: rental.confirmedAt, icon: CheckCircle2 },
    { key: "delivered", label: "Delivered", date: rental.deliveredAt, icon: Truck },
    { key: "returned", label: "Returned", date: rental.returnedAt, icon: RotateCcw },
    { key: "closed", label: "Closed", date: rental.closedAt, icon: XCircle },
  ];
}

function Timeline({ rental }: { rental: Rental }) {
  const events = buildTimeline(rental);
  const lastReachedIdx = events.reduce(
    (acc, e, i) => (e.date ? i : acc),
    -1,
  );

  return (
    <div className="relative ps-8">
      {/* vertical line */}
      <div className="absolute start-3.5 top-2 bottom-2 w-px bg-neutral-200" />

      {events.map((evt, i) => {
        const reached = !!evt.date;
        const Icon = evt.icon;
        return (
          <div key={evt.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
            <div
              className={`absolute start-[-20px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                reached
                  ? i === lastReachedIdx
                    ? "border-amber-500 bg-amber-50 text-amber-600"
                    : "border-green-500 bg-green-50 text-green-600"
                  : "border-neutral-200 bg-white text-neutral-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  reached ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                {evt.label}
              </p>
              {evt.date && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {formatDate(evt.date)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function RentalOverview({ rental }: { rental: Rental }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-xs text-neutral-500">{rental.reference}</p>
            <CardTitle className="mt-1 text-xl">Rental details</CardTitle>
          </div>
          <StatusBadge status={rental.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Period</p>
              <p className="text-sm font-medium mt-0.5">
                {rental.startDate} <ArrowRight className="inline h-3 w-3 mx-1" />{" "}
                {rental.endDate}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Duration</p>
              <p className="text-sm font-medium mt-0.5">{rental.durationDays} days</p>
            </div>
            {rental.trustScoreAtBooking != null && (
              <div>
                <p className="text-xs text-neutral-500 uppercase">Trust score at booking</p>
                <p className="text-sm font-medium mt-0.5">{rental.trustScoreAtBooking}%</p>
              </div>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-100">
            <p className="text-xs text-neutral-500 uppercase mb-2 font-medium">
              Pricing breakdown
            </p>
            <PricingRow
              label={`Daily rate x ${rental.durationDays}`}
              value={formatSar(rental.dailyPriceHalalas)}
            />
            <PricingRow label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
            <PricingRow label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
            <PricingRow label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
            <div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between text-sm font-bold">
              <span>Total payable</span>
              <span className="tabular-nums">{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LegalSection({ legal }: { legal: LegalCommitment }) {
  const [lang, setLang] = React.useState<"en" | "ar">("en");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-xl">Legal commitment</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase">Status</p>
            <StatusBadge status={legal.status} />
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Commitment</p>
            <p className="text-sm font-medium mt-0.5">
              {formatSar(legal.commitmentHalalas)}{" "}
              <span className="text-neutral-400">({legal.commitmentPct}%)</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Signed</p>
            <p className="text-sm font-medium mt-0.5">
              {legal.signedAt ? formatDate(legal.signedAt) : "Not yet signed"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-neutral-500 uppercase mb-1">Contract version</p>
          <p className="text-sm font-mono">{legal.contractVersion}</p>
        </div>

        {/* Clauses */}
        {legal.clausesJson && legal.clausesJson.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Clauses</p>
              <button
                onClick={() => setLang(lang === "en" ? "ar" : "en")}
                className="text-xs text-amber-600 hover:underline"
              >
                {lang === "en" ? "عرض بالعربية" : "Show in English"}
              </button>
            </div>
            <div className="space-y-3">
              {legal.clausesJson.map((clause) => (
                <div
                  key={clause.id}
                  className="border rounded-lg p-3 text-sm"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                >
                  <p className="font-semibold">
                    {lang === "en" ? clause.titleEn : clause.titleAr}
                  </p>
                  <p className="text-neutral-600 mt-1 leading-relaxed">
                    {lang === "en" ? clause.bodyEn : clause.bodyAr}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SanadSection({ sanad }: { sanad: SanadRecord }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-xl">Sanad (promissory note)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase">Status</p>
            <div className="mt-1">
              <StatusBadge status={sanad.status} />
            </div>
          </div>
          {sanad.nafithReference && (
            <div>
              <p className="text-xs text-neutral-500 uppercase">Nafith reference</p>
              <p className="text-sm font-mono mt-0.5">{sanad.nafithReference}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-neutral-500 uppercase">Principal</p>
            <p className="text-sm font-medium mt-0.5">{formatSar(sanad.principalHalalas)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Due amount</p>
            <p className="text-sm font-medium mt-0.5">{formatSar(sanad.dueHalalas)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Maturity date</p>
            <p className="text-sm font-medium mt-0.5">{formatDate(sanad.maturityDate)}</p>
          </div>
          {sanad.executionCaseNumber && (
            <div>
              <p className="text-xs text-neutral-500 uppercase">Execution case no.</p>
              <p className="text-sm font-mono mt-0.5">{sanad.executionCaseNumber}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-neutral-500 text-sm">
          <CreditCard className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
          No payments recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-xl">Payments</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-neutral-500 text-xs uppercase">
                <th className="text-start py-2 pe-4 font-medium">Type</th>
                <th className="text-start py-2 pe-4 font-medium">Status</th>
                <th className="text-start py-2 pe-4 font-medium">Amount</th>
                <th className="text-start py-2 pe-4 font-medium">Invoice</th>
                <th className="text-start py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 pe-4 capitalize">{p.type.replace(/_/g, " ")}</td>
                  <td className="py-3 pe-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-3 pe-4 font-medium tabular-nums">
                    {formatSar(p.amountHalalas)}
                  </td>
                  <td className="py-3 pe-4 font-mono text-xs">
                    {p.invoiceNumber ?? "---"}
                  </td>
                  <td className="py-3 text-neutral-500">
                    {formatDate(p.capturedAt ?? p.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RentalDetail({ id }: { id: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rental-detail", id],
    queryFn: () => rentalsApi.get(id),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto">
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <XCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
              <p className="text-neutral-700 font-medium">
                {(error as Error)?.message ?? "Rental not found"}
              </p>
              <Link href="/my-rentals">
                <a className="text-amber-600 hover:underline text-sm mt-3 inline-block">
                  Back to My Rentals
                </a>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const { rental, legal, sanad, payments } = data;

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Back link */}
        <Link href="/my-rentals">
          <a className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600 transition-colors mb-6">
            <ChevronLeft className="h-4 w-4" />
            Back to My Rentals
          </a>
        </Link>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            {sanad && <TabsTrigger value="sanad">Sanad</TabsTrigger>}
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview">
            <RentalOverview rental={rental} />
          </TabsContent>

          {/* Legal tab */}
          <TabsContent value="legal">
            {legal ? (
              <LegalSection legal={legal} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-neutral-500 text-sm">
                  <FileSignature className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                  No legal commitment on record.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sanad tab */}
          {sanad && (
            <TabsContent value="sanad">
              <SanadSection sanad={sanad} />
            </TabsContent>
          )}

          {/* Payments tab */}
          <TabsContent value="payments">
            <PaymentsTable payments={payments} />
          </TabsContent>

          {/* Timeline tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-xl">Lifecycle timeline</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Timeline rental={rental} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
