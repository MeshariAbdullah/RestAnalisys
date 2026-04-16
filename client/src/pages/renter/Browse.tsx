import React, { useState, useMemo, useCallback } from "react";
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
  X,
  ChevronDown,
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

const CATEGORIES = [
  { id: undefined as string | undefined, label: "All", icon: Diamond },
  { id: "handbag", label: "Handbags", icon: Diamond },
  { id: "watch", label: "Watches", icon: Watch },
  { id: "dress", label: "Dresses", icon: Shirt },
  { id: "jewelry", label: "Jewelry", icon: Gem },
  { id: "accessory", label: "Accessories", icon: Gem },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "value_desc", label: "Highest Value" },
] as const;

const PRICE_RANGES = [
  { label: "Any price", min: undefined, max: undefined },
  { label: "Under 100 SAR/day", min: undefined, max: 10000 },
  { label: "100 - 500 SAR/day", min: 10000, max: 50000 },
  { label: "500 - 1,000 SAR/day", min: 50000, max: 100000 },
  { label: "1,000 - 5,000 SAR/day", min: 100000, max: 500000 },
  { label: "5,000+ SAR/day", min: 500000, max: undefined },
];

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "value_desc">("newest");
  const [priceRange, setPriceRange] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const activeRange = PRICE_RANGES[priceRange];

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category, debouncedSearch, sortBy, priceRange],
    queryFn: () =>
      assetsApi.listings({
        category,
        search: debouncedSearch || undefined,
        sortBy,
        minDaily: activeRange?.min,
        maxDaily: activeRange?.max,
        limit: 50,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasActiveFilters = !!category || !!debouncedSearch || priceRange !== 0 || sortBy !== "newest";

  const clearFilters = () => {
    setCategory(undefined);
    setSearch("");
    setDebouncedSearch("");
    setSortBy("newest");
    setPriceRange(0);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">The Collection</h1>
        <p className="text-neutral-500 mt-1">
          Verified, inspected and ready to ship.
        </p>
      </header>

      {/* Search + Filter Toggle */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search brand, model, title..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 text-xs">
                Active
              </Badge>
            )}
          </Button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.label}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => setCategory(c.id)}
              className={category === c.id ? "bg-neutral-900 text-white" : ""}
              size="sm"
            >
              <c.icon className="w-4 h-4 mr-1.5" />
              {c.label}
            </Button>
          ))}
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="bg-neutral-50 border rounded-lg p-4 flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-neutral-600">Price Range</label>
              <Select
                value={String(priceRange)}
                onValueChange={(v) => setPriceRange(Number(v))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((r, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-neutral-600">Sort By</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600 gap-1">
                <X className="w-3 h-3" />
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-500">
          {isLoading ? "Loading..." : `${total} item${total !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Diamond className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 mb-2">No assets match your filters.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((asset) => (
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
                    <Badge className="absolute top-3 right-3 bg-white/90 text-neutral-900 backdrop-blur">
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
    </div>
  );
}
