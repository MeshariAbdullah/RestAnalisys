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
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "value_desc", label: "Highest Value" },
];

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const minDaily = minPrice ? Math.round(Number(minPrice) * 100) : undefined;
  const maxDaily = maxPrice ? Math.round(Number(maxPrice) * 100) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category, search, sortBy, minDaily, maxDaily],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (search) params.search = search;
      if (sortBy) params.sortBy = sortBy;
      if (minDaily) params.minDaily = String(minDaily);
      if (maxDaily) params.maxDaily = String(maxDaily);
      params.limit = "50";
      const qs = new URLSearchParams(params);
      return fetch(
        `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + "/api" : "/api"}/assets/listings?${qs}`
      ).then((r) => r.json()) as Promise<{ items: Asset[]; count: number; total: number }>;
    },
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
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-neutral-100" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Filters
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border rounded-md px-3 py-1.5 bg-white"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

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

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-neutral-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-600 whitespace-nowrap">Daily Price (SAR):</label>
              <Input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24"
              />
              <span className="text-neutral-400">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24"
              />
            </div>
            {(minPrice || maxPrice || category) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setCategory(undefined);
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {data && (
        <p className="text-sm text-neutral-500 mb-4">
          {data.total} item{data.total !== 1 ? "s" : ""} found
        </p>
      )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((asset) => (
            <Link key={asset.id} href={`/browse/${asset.id}`}>
              <a>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="aspect-square bg-neutral-100 relative flex items-center justify-center">
                    {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                      <img
                        src={
                          asset.studioImagesJson[0] ||
                          asset.submissionImagesJson[0]
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
      )}
    </div>
  );
}
