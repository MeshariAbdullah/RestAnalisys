import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, type Asset } from "@/lib/api";
import { useLanguage, type TranslationKey } from "@/lib/i18n";

const CATEGORIES: Array<{ id: string | undefined; label: TranslationKey; icon: typeof Diamond }> = [
  { id: undefined, label: "common.all", icon: Diamond },
  { id: "handbag", label: "category.handbag", icon: Diamond },
  { id: "watch", label: "category.watch", icon: Watch },
  { id: "dress", label: "category.dress", icon: Shirt },
  { id: "jewelry", label: "category.jewelry", icon: Gem },
];

const SORT_OPTIONS = [
  { value: "newest", labelEn: "Newest", labelAr: "الأحدث" },
  { value: "price_asc", labelEn: "Price: Low → High", labelAr: "السعر: من الأقل" },
  { value: "price_desc", labelEn: "Price: High → Low", labelAr: "السعر: من الأعلى" },
  { value: "value_desc", labelEn: "Value: Highest", labelAr: "القيمة: الأعلى" },
];

export default function Browse() {
  const { t, lang } = useLanguage();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Debounce search
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category, debouncedSearch, sort, page],
    queryFn: () =>
      assetsApi.listings({
        category,
        search: debouncedSearch || undefined,
        sort: sort as any,
        page,
        limit: 12,
      }),
  });

  const items: Asset[] = data?.items ?? [];
  const totalPages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {lang === "ar" ? "المعروضات" : "The Collection"}
        </h1>
        <p className="text-neutral-500 mt-1">
          {lang === "ar"
            ? "تم التحقق والفحص وجاهزة للشحن"
            : "Verified, inspected and ready to ship."}
        </p>
      </header>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder={lang === "ar" ? "ابحث عن ماركة، موديل، عنوان..." : "Search brand, model, title…"}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="h-10 rounded-md border border-neutral-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {lang === "ar" ? s.labelAr : s.labelEn}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.label}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => { setCategory(c.id); setPage(1); }}
              className={category === c.id ? "bg-neutral-900 text-white" : ""}
              size="sm"
            >
              <c.icon className="w-4 h-4 mr-1.5" />
              {t(c.label)}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-neutral-500 mb-4">
          {lang === "ar"
            ? `${total} منتج${total !== 1 ? "ات" : ""}`
            : `${total} item${total !== 1 ? "s" : ""}`}
          {debouncedSearch && (
            <span>
              {lang === "ar" ? ` — نتائج "${debouncedSearch}"` : ` — results for "${debouncedSearch}"`}
            </span>
          )}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Diamond className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 font-medium">
            {lang === "ar" ? "لا توجد منتجات مطابقة" : "No assets match your filters."}
          </p>
          <p className="text-neutral-400 text-sm mt-1">
            {lang === "ar" ? "جرب تعديل البحث أو الفلاتر" : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((asset) => (
              <Link key={asset.id} href={`/browse/${asset.id}`}>
                <a>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full group">
                    <div className="aspect-[4/3] bg-neutral-100 relative flex items-center justify-center overflow-hidden">
                      {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                        <img
                          src={asset.studioImagesJson[0] || asset.submissionImagesJson[0]}
                          alt={asset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Diamond className="w-16 h-16 text-neutral-300" />
                      )}
                      <Badge className="absolute top-3 right-3 bg-white/90 text-neutral-900 backdrop-blur text-xs capitalize">
                        {asset.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
                        {asset.brand}
                      </p>
                      <h3 className="font-semibold text-base mt-1 line-clamp-1">
                        {asset.title}
                      </h3>
                      {asset.model && (
                        <p className="text-sm text-neutral-500 line-clamp-1">{asset.model}</p>
                      )}
                      <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-neutral-100">
                        <p className="text-amber-600 font-bold text-sm">
                          {formatSar(asset.dailyRentalPriceHalalas)}
                          <span className="text-xs font-normal text-neutral-500">
                            {" "}/{lang === "ar" ? " يوم" : " day"}
                          </span>
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatSar(asset.evaluatedValueHalalas)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-neutral-600">
                {lang === "ar"
                  ? `صفحة ${page} من ${totalPages}`
                  : `Page ${page} of ${totalPages}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
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
