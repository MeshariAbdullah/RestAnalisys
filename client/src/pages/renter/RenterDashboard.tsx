import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  ArrowRight,
  Diamond,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rentalsApi, formatSar, type Rental } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default function RenterDashboard() {
  const user = getCurrentUser();
  const { data: rentals, isLoading } = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const active = (rentals ?? []).filter((r) =>
    ["confirmed", "out_for_delivery", "active"].includes(r.status)
  );
  const pending = (rentals ?? []).filter((r) =>
    ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(r.status)
  );
  const completed = (rentals ?? []).filter((r) =>
    ["closed", "closed_with_penalty"].includes(r.status)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.fullName?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-neutral-500 mt-1">
          Here's an overview of your rental activity.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Package}
          label="Active rentals"
          value={active.length}
          color="text-green-600"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={pending.length}
          color="text-amber-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={completed.length}
          color="text-blue-600"
        />
        <StatCard
          icon={Diamond}
          label="Total spent"
          value={formatSar(
            (rentals ?? []).reduce(
              (sum, r) =>
                ["closed", "closed_with_penalty", "active", "confirmed"].includes(r.status)
                  ? sum + r.totalPayableHalalas
                  : sum,
              0
            )
          )}
          color="text-amber-600"
          isText
        />
      </div>

      {/* Pending actions */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Requires your action
          </h2>
          <div className="space-y-3">
            {pending.map((r) => (
              <Link key={r.id} href={`/rental/${r.id}`}>
                <a>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-200 bg-amber-50/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                        <p className="font-medium mt-0.5">
                          {r.startDate} - {r.endDate}
                        </p>
                        <Badge className="mt-1 bg-amber-100 text-amber-800 border-0">
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatSar(r.totalPayableHalalas)}</p>
                        <ArrowRight className="w-4 h-4 text-neutral-400 ml-auto mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active rentals */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Active rentals</h2>
          <div className="space-y-3">
            {active.map((r) => (
              <Link key={r.id} href={`/rental/${r.id}`}>
                <a>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                        <p className="font-medium mt-0.5">
                          {r.startDate} - {r.endDate} ({r.durationDays} days)
                        </p>
                        <Badge className="mt-1 bg-green-100 text-green-700 border-0">
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatSar(r.totalPayableHalalas)}</p>
                        <ArrowRight className="w-4 h-4 text-neutral-400 ml-auto mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent completed */}
      {completed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Recent completed</h2>
          <div className="space-y-3">
            {completed.slice(0, 5).map((r) => (
              <Link key={r.id} href={`/rental/${r.id}`}>
                <a>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-80">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-neutral-500">{r.reference}</p>
                        <p className="font-medium mt-0.5">
                          {r.startDate} - {r.endDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatSar(r.totalPayableHalalas)}</p>
                        <Badge className="bg-green-100 text-green-700 border-0">completed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!rentals || rentals.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="mb-4">You haven't rented anything yet.</p>
            <Link href="/browse">
              <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                Browse the collection
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick action */}
      <div className="mt-4">
        <Link href="/browse">
          <Button variant="outline" className="mr-3">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Browse collection
          </Button>
        </Link>
        <Link href="/my-rentals">
          <Button variant="outline">
            <Package className="w-4 h-4 mr-2" />
            All rentals
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isText,
}: {
  icon: typeof Package;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className={`w-5 h-5 ${color} mb-2`} />
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
        <p className={`${isText ? "text-xl" : "text-3xl"} font-bold mt-1`}>{value}</p>
      </CardContent>
    </Card>
  );
}
