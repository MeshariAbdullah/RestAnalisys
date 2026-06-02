import React, { useState } from "react";
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
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { assetsApi, formatSar, type Asset } from "@/lib/api";

const CATEGORIES = [
  { id: undefined as string | undefined, label: "All", icon: Sparkles },
  { id: "handbag", label: "Bags", icon: Diamond },
  { id: "watch", label: "Watches", icon: Watch },
  { id: "dress", label: "Dresses", icon: Shirt },
  { id: "jewelry", label: "Jewelry", icon: Gem },
];

const SORT_OPTIONS = [
  { value: "newest" as const, label: "Newest First" },
  { value: "price_asc" as const, label: "Price: Low to High" },
  { value: "price_desc" as const, label: "Price: High to Low" },
];

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debounceTimer = React.useRef<ReturnType<typeof setTimeout>>();

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category, debouncedSearch, sort, page, minPrice, maxPrice],
    queryFn: () =>
      assetsApi.listings({
        category,
        search: debouncedSearch || undefined,
        sort,
        page,
        minDaily: minPrice ? Number(minPrice) * 100 : undefined,
        maxDaily: maxPrice ? Number(maxPrice) * 100 : undefined,
      }),
  });

  function handleCategoryChange(cat: string | undefined) {
    setCategory(cat);
    setPage(1);
  }

  function handleSortChange(s: "newest" | "price_asc" | "price_desc") {
    setSort(s);
    setPage(1);
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">The Collection</h1>
        <p className="text-neutral-500 mt-1">
          Verified, inspected and ready to ship.
        </p>
      </header>

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search brand, model, title..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "border-amber-500 text-amber-600" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
            </Button>
            <div className="flex bg-neutral-100 rounded-lg p-0.5 gap-0.5">
              {SORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSortChange(opt.value)}
                  className={
                    sort === opt.value
                      ? "bg-white shadow-sm text-neutral-900 font-medium"
                      : "text-neutral-500 hover:text-neutral-700"
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.label}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => handleCategoryChange(c.id)}
              className={category === c.id ? "bg-neutral-900 text-white" : ""}
              size="sm"
            >
              <c.icon className="w-4 h-4 mr-1.5" />
              {c.label}
            </Button>
          ))}
        </div>

        {/* Price filter panel */}
        {showFilters && (
          <div className="bg-neutral-50 border rounded-lg p-4 flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs text-neutral-500">Min Price (SAR/day)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                className="w-32 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-500">Max Price (SAR/day)</Label>
              <Input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                className="w-32 mt-1"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMinPrice(""); setMaxPrice(""); setPage(1); }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-neutral-500 mb-4">
          {total} {total === 1 ? "item" : "items"} found
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          No assets match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((asset) => (
            <Link key={asset.id} href={`/browse/${asset.id}`}>
              <a>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="aspect-square bg-neutral-100 relative flex items-center justify-center">
                    {(asset as any).studioImagesJson?.[0] || (asset as any).submissionImagesJson?.[0] ? (
                      <img
                        src={(asset as any).studioImagesJson[0] || (asset as any).submissionImagesJson[0]}
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Diamond className="w-16 h-16 text-neutral-300" />
                    )}
                    <Badge className="absolute top-3 right-3 bg-white/90 text-neutral-900 backdrop-blur">
                      {asset.category}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
                      {asset.brand}
                    </p>
                    <h3 className="font-semibold text-lg mt-1 line-clamp-1">{asset.title}</h3>
                    {asset.model && (
                      <p className="text-sm text-neutral-500 line-clamp-1">{asset.model}</p>
                    )}

                    {/* Rating */}
                    {asset.rating && asset.rating.count > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{asset.rating.avg.toFixed(1)}</span>
                        <span className="text-xs text-neutral-400">({asset.rating.count})</span>
                      </div>
                    )}

                    <div className="flex items-baseline justify-between mt-3">
                      <p className="text-amber-600 font-bold">
                        {formatSar(asset.dailyRentalPriceHalalas)}
                        <span className="text-xs font-normal text-neutral-500"> / day</span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Value {formatSar(asset.evaluatedValueHalalas)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={page === pageNum ? "bg-neutral-900 text-white" : ""}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
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
    </div>
  );
}
