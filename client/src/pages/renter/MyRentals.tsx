import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Truck,
  Eye,
  ShieldAlert,
  FileSignature,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";

const STATUS_META: Record<
  string,
  { color: string; icon: typeof Clock; group: string }
> = {
  pending_risk_review: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
    group: "active",
  },
  pending_legal_signing: {
    color: "bg-amber-100 text-amber-800",
    icon: FileSignature,
    group: "active",
  },
  pending_payment: {
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
    group: "active",
  },
  confirmed: {
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
    group: "active",
  },
  out_for_delivery: {
    color: "bg-blue-100 text-blue-700",
    icon: Truck,
    group: "active",
  },
  active: {
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    group: "active",
  },
  return_in_transit: {
    color: "bg-amber-100 text-amber-800",
    icon: Truck,
    group: "active",
  },
  under_inspection: {
    color: "bg-amber-100 text-amber-800",
    icon: Eye,
    group: "active",
  },
  closed: {
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    group: "completed",
  },
  closed_with_penalty: {
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
    group: "completed",
  },
  in_dispute: {
    color: "bg-red-100 text-red-700",
    icon: ShieldAlert,
    group: "completed",
  },
  enforcement: {
    color: "bg-red-200 text-red-800",
    icon: ShieldAlert,
    group: "completed",
  },
  cancelled: {
    color: "bg-neutral-200 text-neutral-600",
    icon: XCircle,
    group: "completed",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    color: "bg-neutral-200 text-neutral-700",
    icon: Clock,
    group: "active",
  };
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.color} hover:${meta.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

type TabFilter = "all" | "active" | "completed";

export default function MyRentals() {
  const [tab, setTab] = useState<TabFilter>("all");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const rentals = data ?? [];
  const filtered =
    tab === "all"
      ? rentals
      : rentals.filter((r: Rental) => {
          const meta = STATUS_META[r.status];
          return meta ? meta.group === tab : tab === "active";
        });

  const activeCount = rentals.filter((r: Rental) => {
    const meta = STATUS_META[r.status];
    return meta ? meta.group === "active" : true;
  }).length;

  const completedCount = rentals.filter((r: Rental) => {
    const meta = STATUS_META[r.status];
    return meta?.group === "completed";
  }).length;

  async function handleCancel(rentalId: number) {
    await rentalsApi.cancel(rentalId, "Cancelled by renter");
    await qc.invalidateQueries({ queryKey: ["rentals-mine"] });
  }

  const canCancel = (status: string) =>
    ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(
      status
    );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My rentals</h1>
      <p className="text-neutral-500 mb-6">
        Track contracts, shipments and returns.
      </p>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabFilter)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All ({rentals.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {tab === "all" ? (
              <>
                <p>You haven't rented anything yet.</p>
                <Link href="/browse">
                  <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                    Browse the collection
                  </a>
                </Link>
              </>
            ) : (
              <p>No {tab} rentals.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((r: Rental) => (
            <Card
              key={r.id}
              className="hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-mono text-xs text-neutral-500">
                        {r.reference}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="font-semibold">
                      {new Date(r.startDate).toLocaleDateString("en-SA", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(r.endDate).toLocaleDateString("en-SA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      <span className="text-neutral-500 font-normal ml-2">
                        ({r.durationDays} days)
                      </span>
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
                      <span>
                        Daily: {formatSar(r.dailyPriceHalalas)}
                      </span>
                      <span>
                        Subtotal: {formatSar(r.rentalSubtotalHalalas)}
                      </span>
                      <span>VAT: {formatSar(r.vatHalalas)}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase">
                        Total payable
                      </p>
                      <p className="font-bold text-xl">
                        {formatSar(r.totalPayableHalalas)}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Commitment: {formatSar(r.legalCommitmentHalalas)} (
                      {r.legalCommitmentPct}%)
                    </p>

                    {canCancel(r.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 mt-1"
                        onClick={() => handleCancel(r.id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}

                    {r.status === "pending_legal_signing" && (
                      <Link href={`/legal/${r.id}`}>
                        <Button
                          size="sm"
                          className="bg-amber-500 text-neutral-950 hover:bg-amber-400 mt-1"
                        >
                          <FileSignature className="w-3.5 h-3.5 mr-1" />
                          Sign contract
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
