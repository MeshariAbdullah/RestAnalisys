import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Diamond,
  Receipt,
  Gavel,
  FileSignature,
  AlertOctagon,
  TrendingUp,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi, formatSar } from "@/lib/api";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const searchResults = useQuery({
    queryKey: ["admin-search", searchQuery],
    queryFn: () => adminApi.search(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const hasResults = searchResults.data &&
    (searchResults.data.users.length > 0 ||
     searchResults.data.assets.length > 0 ||
     searchResults.data.rentals.length > 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Admin overview</h1>
      <p className="text-neutral-500 mb-4">
        Platform-wide metrics and moderation queues.
      </p>

      {/* Global Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="Search users, assets, rentals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
        />
        {hasResults && (
          <Card className="absolute z-10 top-12 left-0 w-full max-w-md shadow-lg">
            <CardContent className="p-3 max-h-80 overflow-y-auto">
              {searchResults.data!.users.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-neutral-500 mb-1">Users</p>
                  {searchResults.data!.users.map((u) => (
                    <Link key={u.id} href="/admin/users">
                      <a className="flex justify-between items-center p-2 hover:bg-neutral-50 rounded text-sm">
                        <span>{u.fullName} ({u.email})</span>
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                      </a>
                    </Link>
                  ))}
                </div>
              )}
              {searchResults.data!.assets.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-neutral-500 mb-1">Assets</p>
                  {searchResults.data!.assets.map((a) => (
                    <div key={a.id} className="flex justify-between items-center p-2 hover:bg-neutral-50 rounded text-sm">
                      <span>{a.brand} — {a.title}</span>
                      <Badge variant="secondary" className="text-xs capitalize">{a.status.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.data!.rentals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">Rentals</p>
                  {searchResults.data!.rentals.map((r) => (
                    <div key={r.id} className="flex justify-between items-center p-2 hover:bg-neutral-50 rounded text-sm">
                      <span>{r.reference}</span>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="text-xs capitalize">{r.status.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-neutral-500">{formatSar(r.totalPayableHalalas)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          icon={Users}
          label="Users"
          value={isLoading ? "…" : data?.users ?? 0}
        />
        <Kpi
          icon={Diamond}
          label="Listed assets"
          value={isLoading ? "…" : data?.listedAssets ?? 0}
        />
        <Kpi
          icon={TrendingUp}
          label="Rented assets"
          value={isLoading ? "…" : data?.rentedAssets ?? 0}
        />
        <Kpi
          icon={Receipt}
          label="Rentals this month"
          value={isLoading ? "…" : data?.rentalsThisMonth ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">
              Gross rental revenue
            </p>
            <p className="text-3xl font-bold">
              {isLoading
                ? "…"
                : formatSar(data?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">Platform fees</p>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? "…" : formatSar(data?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">VAT collected</p>
            <p className="text-3xl font-bold">
              {isLoading ? "…" : formatSar(data?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Gavel className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-sm text-neutral-500">Open disputes</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.openDisputes ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <FileSignature className="w-8 h-8 text-amber-500 mb-3" />
                <p className="text-sm text-neutral-500">Active Sanads</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.activeSanads ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <AlertOctagon className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm text-neutral-500">
                  Sanads under execution
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.sanadsUnderExecution ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
