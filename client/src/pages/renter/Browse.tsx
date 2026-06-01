import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem, ArrowUpDown } from "lucide-react";
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
import { assetsApi, formatSar, type Asset } from "@/lib/api";

const CATEGORIES = [
  { id: undefined, label: "All", icon: Diamond },
  { id: "bag", label: "Bags", icon: Diamond },
  { id: "watch", label: "Watches", icon: Watch },
  { id: "dress", label: "Dresses", icon: Shirt },
  { id: "jewelry", label: "Jewelry", icon: Gem },
];

type SortOption = "newest" | "price_low" | "price_high" | "brand_az";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "brand_az", label: "Brand A-Z" },
];

function sortAssets(assets: Asset[], sort: SortOption): Asset[] {
  const sorted = [...assets];
  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "price_low":
      return sorted.sort(
        (a, b) =>
          (a.dailyRentalPriceHalalas ?? 0) - (b.dailyRentalPriceHalalas ?? 0)
      );
    case "price_high":
      return sorted.sort(
        (a, b) =>
          (b.dailyRentalPriceHalalas ?? 0) - (a.dailyRentalPriceHalalas ?? 0)
      );
    case "brand_az":
      return sorted.sort((a, b) => a.brand.localeCompare(b.brand));
    default:
      return sorted;
  }
}

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category],
    queryFn: () => assetsApi.listings({ category }),
  });

  const filtered = useMemo(() => {
    let items = data?.items ?? [];

    // Text search filter
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a: Asset) =>
        `${a.brand} ${a.title} ${a.model ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    // Sort
    items = sortAssets(items, sort);

    return items;
  }, [data?.items, search, sort]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">The Collection</h1>
        <p className="text-neutral-500 mt-1">
          Verified, inspected and ready to ship.
        </p>
      </header>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Search bar and sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search brand, model, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as SortOption)}
            >
              <SelectTrigger>
                <ArrowUpDown className="w-4 h-4 mr-2 text-neutral-400" />
                <SelectValue placeholder="Sort by" />
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
        </div>

        {/* Category filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.label}
              variant={category === c.id ? "default" : "outline"}
              onClick={() => setCategory(c.id)}
              className={
                category === c.id ? "bg-neutral-900 text-white" : ""
              }
              size="sm"
            >
              <c.icon className="w-4 h-4 mr-1.5" />
              {c.label}
            </Button>
          ))}
        </div>

        {/* Active filter summary */}
        {(search || category) && (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            {search && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setSearch("")}
              >
                &quot;{search}&quot; &times;
              </Badge>
            )}
            {category && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setCategory(undefined)}
              >
                {CATEGORIES.find((c) => c.id === category)?.label} &times;
              </Badge>
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          No assets match your filters.
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
