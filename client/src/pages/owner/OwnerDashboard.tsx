import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Diamond, Plus, TrendingUp, Package, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, paymentsApi, formatSar, type Asset } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";

function statusColor(s: string): string {
  if (s === "listed" || s === "rented_out") return "bg-green-100 text-green-700";
  if (s.startsWith("pending")) return "bg-amber-100 text-amber-800";
  if (s === "rejected" || s === "withdrawn") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function OwnerDashboard() {
  const { t } = useI18n();
  const user = getCurrentUser();

  const assetsQuery = useQuery({
    queryKey: ["assets-mine"],
    queryFn: () => assetsApi.mine(),
  });

  const payoutsQuery = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => paymentsApi.myPayouts(),
  });

  const assets = assetsQuery.data ?? [];
  const totalValue = assets.reduce(
    (sum, a) => sum + (a.evaluatedValueHalalas ?? 0),
    0
  );
  const activeCount = assets.filter(
    (a) => a.status === "listed" || a.status === "rented_out"
  ).length;
  const totalPayouts = (payoutsQuery.data ?? []).reduce(
    (sum, p) => sum + Number(p.netHalalas ?? 0),
    0
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {t("dashboard.welcome", { name: user?.fullName ?? "" })}
          </h1>
          <p className="text-neutral-500 mt-1">
            {t("nav.ownerDashboard")}
          </p>
        </div>
        <Link href="/owner/submit">
          <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
            <Plus className="w-4 h-4 me-1.5" />
            {t("dashboard.submitNew")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Diamond className="w-4 h-4" />
              {t("dashboard.activeAssets")}
            </div>
            <p className="text-3xl font-bold">{activeCount}</p>
            <p className="text-xs text-neutral-500 mt-1">
              / {assets.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <TrendingUp className="w-4 h-4" />
              {t("dashboard.portfolioValue")}
            </div>
            <p className="text-3xl font-bold">{formatSar(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 text-neutral-500 text-sm">
              <Wallet className="w-4 h-4" />
              {t("dashboard.lifetimePayouts")}
            </div>
            <p className="text-3xl font-bold">{formatSar(totalPayouts)}</p>
            <Link href="/owner/payouts">
              <a className="text-xs text-amber-600 hover:underline mt-1 inline-block">
                {t("dashboard.viewPayouts")}
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>

      {assetsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>{t("common.noResults")}</p>
            <Link href="/owner/submit">
              <a className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                {t("dashboard.submitNew")}
              </a>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((asset: Asset) => (
            <Link key={asset.id} href={`/owner/assets/${asset.id}`}>
              <a>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
                  <div className="aspect-video bg-neutral-100 relative flex items-center justify-center overflow-hidden">
                    {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                      <img
                        src={
                          asset.studioImagesJson[0] ||
                          asset.submissionImagesJson[0]
                        }
                        alt={asset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Diamond className="w-12 h-12 text-neutral-300" />
                    )}
                    <Badge
                      className={`absolute top-3 end-3 border-0 ${statusColor(
                        asset.status
                      )}`}
                    >
                      {asset.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                      {asset.brand}
                    </p>
                    <p className="font-semibold mt-0.5 line-clamp-1">
                      {asset.title}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-neutral-500">{t("browse.dailyRent")}</span>
                      <span className="font-semibold text-amber-600">
                        {formatSar(asset.dailyRentalPriceHalalas)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">{t("browse.value")}</span>
                      <span>{formatSar(asset.evaluatedValueHalalas)}</span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
