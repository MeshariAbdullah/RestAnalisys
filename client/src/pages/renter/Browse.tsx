import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, type Asset } from "@/lib/api";

const CATEGORIES = [
  { id: undefined, label: "All", icon: Diamond },
  { id: "handbag", label: "Bags", icon: Diamond },
  { id: "watch", label: "Watches", icon: Watch },
  { id: "dress", label: "Dresses", icon: Shirt },
  { id: "jewelry", label: "Jewelry", icon: Gem },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "value_asc", label: "Value: Low to High" },
  { value: "value_desc", label: "Value: High to Low" },
] as const;

type SortBy = (typeof SORT_OPTIONS)[number]["value"];

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");

  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category, debouncedSearch, sortBy, maxPrice],
    queryFn: () =>
      assetsApi.listings({
        category,
        search: debouncedSearch || undefined,
        sortBy,
        maxDaily: maxPrice ? Number(maxPrice) * 100 : undefined,
        limit: 50,
      }),
  });

  const items = data?.items ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">The Collection</h1>
          <p className="text-neutral-500 mt-1">
            Verified, inspected and ready to ship.
          </p>
        </header>

        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
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
                className={showFilters ? "bg-neutral-900 text-white" : ""}
              >
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                Filters
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
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

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-neutral-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="text-sm bg-white border border-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">Max Daily Price (SAR)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-40"
                />
              </div>
              {(maxPrice || debouncedSearch) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMaxPrice("");
                      setSearch("");
                      setDebouncedSearch("");
                      setCategory(undefined);
                      setSortBy("newest");
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          )}
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
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            No assets match your filters.
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-500 mb-4">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((asset) => (
                <Link key={asset.id} href={`/browse/${asset.id}`}>
                  <a>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <div className="aspect-square bg-neutral-100 relative flex items-center justify-center">
                        {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                          <img
                            src={
                              (asset.studioImagesJson as string[])?.[0] ||
                              (asset.submissionImagesJson as string[])?.[0]
                            }
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
                          <p className="text-sm text-neutral-500 line-clamp-1">
                            {asset.model}
                          </p>
                        )}
                        <div className="flex items-baseline justify-between mt-4">
                          <p className="text-amber-600 font-bold">
                            {formatSar(asset.dailyRentalPriceHalalas)}
                            <span className="text-xs font-normal text-neutral-500">
                              {" "}
                              / day
                            </span>
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
          </>
        )}
    </div>
  );
}
