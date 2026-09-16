import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag, FileText, Diamond, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { rentalsApi, assetsApi, formatSar, type Rental } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getScoreBg } from "@/lib/utils";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    confirmed: "bg-blue-100 text-blue-800",
    out_for_delivery: "bg-purple-100 text-purple-800",
    pending_legal_signing: "bg-amber-100 text-amber-800",
    pending_payment: "bg-amber-100 text-amber-800",
    closed: "bg-neutral-100 text-neutral-600",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-neutral-100 text-neutral-600";
}

export default function RenterDashboard() {
  const user = getCurrentUser();

  const { data: rentals } = useQuery({
    queryKey: ["my-rentals"],
    queryFn: () => rentalsApi.mine(),
  });

  const { data: listings } = useQuery({
    queryKey: ["listings-featured"],
    queryFn: () => assetsApi.listings({ limit: 4 }),
  });

  const all = rentals ?? [];
  const active = all.filter((r) =>
    ["active", "confirmed", "out_for_delivery"].includes(r.status)
  );
  const pending = all.filter((r) =>
    ["pending_legal_signing", "pending_payment", "pending_risk_review"].includes(r.status)
  );
  const completed = all.filter((r) =>
    ["closed", "closed_with_penalty"].includes(r.status)
  );

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.fullName?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-neutral-500 mt-1">Your rental overview</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<FileText className="w-5 h-5" />} label="Total Rentals" value={all.length} />
          <StatCard icon={<Clock className="w-5 h-5 text-blue-600" />} label="Active" value={active.length} accent="blue" />
          <StatCard icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} label="Pending" value={pending.length} accent="amber" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="Completed" value={completed.length} accent="green" />
        </div>

        {user && (
          <div className="mb-8 flex items-center gap-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${getScoreBg(user.trustScore)}`}>
              Trust Score: {user.trustScore}
            </div>
            {!user.nafathVerified && (
              <Link href="/profile">
                <a className="text-sm text-amber-600 hover:underline flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Verify your identity to start renting
                </a>
              </Link>
            )}
          </div>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Active Rentals</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {active.map((r) => (
                <RentalCard key={r.id} rental={r} />
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Pending Action</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {pending.map((r) => (
                <RentalCard key={r.id} rental={r} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Featured Items</h2>
            <Link href="/browse">
              <a>
                <Button variant="outline" size="sm">
                  <ShoppingBag className="w-4 h-4 mr-1.5" /> Browse All
                </Button>
              </a>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(listings?.items ?? []).map((a) => (
              <Link key={a.id} href={`/browse/${a.id}`}>
                <a>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                      {a.studioImagesJson?.[0] ? (
                        <img src={a.studioImagesJson[0]} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <Diamond className="w-12 h-12 text-neutral-300" />
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-neutral-500">{a.brand}</p>
                      <p className="text-sm font-semibold line-clamp-1">{a.title}</p>
                      <p className="text-amber-600 text-sm font-bold mt-1">
                        {formatSar(a.dailyRentalPriceHalalas)}/day
                      </p>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode; label: string; value: number; accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          accent ? `bg-${accent}-50` : "bg-neutral-100"
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-mono text-neutral-500">{rental.reference}</p>
          <Badge className={statusBadge(rental.status)}>
            {rental.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">
            {rental.startDate} - {rental.endDate}
          </span>
          <span className="font-semibold text-amber-600">
            {formatSar(rental.totalPayableHalalas)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
