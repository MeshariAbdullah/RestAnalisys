import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Diamond,
  Watch,
  Shirt,
  Gem,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assetsApi, formatSar, halalasToSar, type Asset } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

const CATEGORIES = [
  { id: undefined, labelKey: "common.all" as const, icon: Diamond },
  { id: "handbag", labelKey: "browse.bags" as const, icon: Diamond },
  { id: "watch", labelKey: "browse.watches" as const, icon: Watch },
  { id: "dress", labelKey: "browse.dresses" as const, icon: Shirt },
  { id: "jewelry", labelKey: "browse.jewelry" as const, icon: Gem },
];

type SortOption = "newest" | "price_low" | "price_high" | "value";

const ITEMS_PER_PAGE = 12;

export default function Browse() {
  const { t, locale } = useLocale();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category],
    queryFn: () => assetsApi.listings({ category }),
  });

  const filtered = useMemo(() => {
    let items = data?.items ?? [];

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (a: Asset) =>
          `${a.brand} ${a.title} ${a.model ?? ""}`
            .toLowerCase()
            .includes(s)
      );
    }

    if (minPrice) {
      const min = Number(minPrice) * 100;
      items = items.filter((a) => (a.dailyRentalPriceHalalas ?? 0) >= min);
    }
    if (maxPrice) {
      const max = Number(maxPrice) * 100;
      items = items.filter((a) => (a.dailyRentalPriceHalalas ?? 0) <= max);
    }

    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return (a.dailyRentalPriceHalalas ?? 0) - (b.dailyRentalPriceHalalas ?? 0);
        case "price_high":
          return (b.dailyRentalPriceHalalas ?? 0) - (a.dailyRentalPriceHalalas ?? 0);
        case "value":
          return (b.evaluatedValueHalalas ?? 0) - (a.evaluatedValueHalalas ?? 0);
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return items;
  }, [data, search, sortBy, minPrice, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasActiveFilters = !!(search || minPrice || maxPrice);

  function clearFilters() {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setCategory(undefined);
    setSortBy("newest");
    setPage(1);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("browse.title")}</h1>
        <p className="text-neutral-500 mt-1">{t("browse.subtitle")}</p>
      </header>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder={t("browse.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rtl:pl-3 rtl:pr-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-48">
                <ArrowUpDown className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("browse.sortNewest")}</SelectItem>
                <SelectItem value="price_low">{t("browse.sortPriceLow")}</SelectItem>
                <SelectItem value="price_high">{t("browse.sortPriceHigh")}</SelectItem>
                <SelectItem value="value">{t("browse.sortValue")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-neutral-900 text-white" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {t("common.filter")}
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="animate-in slide-in-from-top-2">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-neutral-600 mb-1 block">
                    {t("browse.priceRange")} (SAR/{locale === "ar" ? "يوم" : "day"})
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={t("browse.minPrice")}
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setPage(1);
                      }}
                      min={0}
                    />
                    <span className="text-neutral-400 self-center">-</span>
                    <Input
                      type="number"
                      placeholder={t("browse.maxPrice")}
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setPage(1);
                      }}
                      min={0}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    {t("browse.clearFilters")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.labelKey}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => {
                setCategory(c.id);
                setPage(1);
              }}
              className={category === c.id ? "bg-neutral-900 text-white" : ""}
              size="sm"
            >
              <c.icon className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
              {t(c.labelKey)}
            </Button>
          ))}
          {filtered.length > 0 && (
            <span className="text-sm text-neutral-500 self-center ml-auto rtl:mr-auto rtl:ml-0">
              {filtered.length} {t("browse.results")}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-20">
          <Diamond className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <p className="text-neutral-500 text-lg">{t("browse.noAssets")}</p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              {t("browse.clearFilters")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginated.map((asset) => (
              <Link key={asset.id} href={`/browse/${asset.id}`}>
                <a className="group">
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer h-full group-hover:-translate-y-0.5">
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
                      <Badge className="absolute top-3 right-3 rtl:right-auto rtl:left-3 bg-white/90 text-neutral-900 backdrop-blur">
                        {asset.category}
                      </Badge>
                      {asset.riskCategory === "low" && (
                        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3">
                          <Badge className="bg-emerald-500/90 text-white backdrop-blur">
                            <Star className="w-3 h-3 mr-0.5" />
                            {locale === "ar" ? "موثق" : "Verified"}
                          </Badge>
                        </div>
                      )}
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
                            {" "}
                            {t("common.perDay")}
                          </span>
                        </p>
                        <p className="text-xs text-neutral-500">
                          {t("common.value")} {formatSar(asset.evaluatedValueHalalas)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-neutral-400 px-1">...</span>
                    )}
                    <Button
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={p === currentPage ? "bg-neutral-900 text-white" : ""}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
