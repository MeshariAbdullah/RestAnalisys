import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, halalasToSar, type Asset } from "@/lib/api";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import Layout from "@/components/Layout";

type SortOption = "newest" | "price_low" | "price_high" | "value";

const CATEGORIES: Array<{ id: string | undefined; labelKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }> = [
  { id: undefined, labelKey: "browse.all", icon: Diamond },
  { id: "handbag", labelKey: "browse.bags", icon: Diamond },
  { id: "watch", labelKey: "browse.watches", icon: Watch },
  { id: "dress", labelKey: "browse.dresses", icon: Shirt },
  { id: "jewelry", labelKey: "browse.jewelry", icon: Gem },
];

const SORT_OPTIONS: Array<{ value: SortOption; labelKey: TranslationKey }> = [
  { value: "newest", labelKey: "browse.sortNewest" },
  { value: "price_low", labelKey: "browse.sortPriceLow" },
  { value: "price_high", labelKey: "browse.sortPriceHigh" },
  { value: "value", labelKey: "browse.sortValue" },
];

export default function Browse() {
  const { t } = useI18n();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category],
    queryFn: () => assetsApi.listings({ category, limit: 50 }),
  });

  const filtered = useMemo(() => {
    let items = (data?.items ?? []).filter((a: Asset) =>
      search
        ? `${a.brand} ${a.title} ${a.model ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true
    );

    const minHalalas = minPrice ? parseFloat(minPrice) * 100 : null;
    const maxHalalas = maxPrice ? parseFloat(maxPrice) * 100 : null;
    if (minHalalas != null) {
      items = items.filter((a) => (a.dailyRentalPriceHalalas ?? 0) >= minHalalas);
    }
    if (maxHalalas != null) {
      items = items.filter((a) => (a.dailyRentalPriceHalalas ?? 0) <= maxHalalas);
    }

    switch (sort) {
      case "price_low":
        items = [...items].sort((a, b) => (a.dailyRentalPriceHalalas ?? 0) - (b.dailyRentalPriceHalalas ?? 0));
        break;
      case "price_high":
        items = [...items].sort((a, b) => (b.dailyRentalPriceHalalas ?? 0) - (a.dailyRentalPriceHalalas ?? 0));
        break;
      case "value":
        items = [...items].sort((a, b) => (b.evaluatedValueHalalas ?? 0) - (a.evaluatedValueHalalas ?? 0));
        break;
    }

    return items;
  }, [data, search, sort, minPrice, maxPrice]);

  const hasFilters = minPrice || maxPrice || sort !== "newest";

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("browse.title")}</h1>
          <p className="text-neutral-500 mt-1">{t("browse.subtitle")}</p>
        </header>

        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder={t("browse.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <Button
                  key={c.labelKey}
                  variant={category === c.id ? "default" : "outline"}
                  onClick={() => setCategory(c.id)}
                  className={category === c.id ? "bg-neutral-900 text-white" : ""}
                  size="sm"
                >
                  <c.icon className="w-4 h-4 me-1.5" />
                  {t(c.labelKey)}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-amber-50 border-amber-300" : ""}
              >
                <SlidersHorizontal className="w-4 h-4 me-1.5" />
                {showFilters ? <X className="w-3 h-3" /> : null}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl bg-neutral-50 border">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs text-neutral-500 mb-1 block">{t("browse.minPrice")}</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs text-neutral-500 mb-1 block">{t("browse.maxPrice")}</label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                {SORT_OPTIONS.map((s) => (
                  <Button
                    key={s.value}
                    variant={sort === s.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSort(s.value)}
                    className={sort === s.value ? "bg-neutral-900 text-white" : ""}
                  >
                    {t(s.labelKey)}
                  </Button>
                ))}
              </div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMinPrice(""); setMaxPrice(""); setSort("newest"); }}
                  className="text-red-500 hover:text-red-600"
                >
                  {t("browse.clearFilters")}
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            {t("browse.noResults")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((asset) => (
              <Link key={asset.id} href={`/browse/${asset.id}`}>
                <a>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="aspect-square bg-neutral-100 relative flex items-center justify-center">
                      {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                        <img
                          src={asset.studioImagesJson[0] || asset.submissionImagesJson[0]}
                          alt={asset.title}
                          className="w-full h-full object-cover"
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
                        <p className="text-sm text-neutral-500 line-clamp-1">{asset.model}</p>
                      )}
                      <div className="flex items-baseline justify-between mt-4">
                        <p className="text-amber-600 font-bold">
                          {formatSar(asset.dailyRentalPriceHalalas)}
                          <span className="text-xs font-normal text-neutral-500"> {t("browse.perDay")}</span>
                        </p>
                        <p className="text-xs text-neutral-500">
                          {t("browse.valueLabel")} {formatSar(asset.evaluatedValueHalalas)}
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
    </Layout>
  );
}
