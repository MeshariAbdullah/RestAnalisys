import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, type Asset } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Browse() {
  const { t } = useI18n();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const categories = [
    { id: undefined, label: t("browse.allCategories"), icon: Diamond },
    { id: "bag", label: t("browse.bags"), icon: Diamond },
    { id: "watch", label: t("browse.watches"), icon: Watch },
    { id: "dress", label: t("browse.dresses"), icon: Shirt },
    { id: "jewelry", label: t("browse.jewelry"), icon: Gem },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category],
    queryFn: () => assetsApi.listings({ category }),
  });

  const filtered = (data?.items ?? []).filter((a: Asset) =>
    search
      ? `${a.brand} ${a.title} ${a.model ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("browse.title")}</h1>
        <p className="text-neutral-500 mt-1">
          {t("landing.step3Desc")}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <Button
              key={c.label}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => setCategory(c.id)}
              className={
                category === c.id ? "bg-neutral-900 text-white" : ""
              }
              size="sm"
            >
              <c.icon className="w-4 h-4 me-1.5" />
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          {t("common.noResults")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((asset) => (
            <Link key={asset.id} href={`/browse/${asset.id}`}>
              <a>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full group">
                  <div className="aspect-square bg-neutral-100 relative flex items-center justify-center overflow-hidden">
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
                      <Diamond className="w-16 h-16 text-neutral-300" />
                    )}
                    <Badge className="absolute top-3 end-3 bg-white/90 text-neutral-900 backdrop-blur">
                      {asset.category}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
                      {asset.brand}
                    </p>
                    <h3 className="font-semibold text-lg mt-1 line-clamp-1">
                      {asset.title}
                    </h3>
                    {asset.model && (
                      <p className="text-sm text-neutral-500 line-clamp-1">
                        {asset.model}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between mt-4">
                      <p className="text-amber-600 font-bold">
                        {formatSar(asset.dailyRentalPriceHalalas)}
                        <span className="text-xs font-normal text-neutral-500">
                          {" "}/ {t("browse.dailyRent")}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {t("browse.value")} {formatSar(asset.evaluatedValueHalalas)}
                      </p>
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
