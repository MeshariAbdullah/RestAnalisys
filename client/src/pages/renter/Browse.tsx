import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem, SlidersHorizontal, ArrowUpDown, Grid3X3, LayoutList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assetsApi, formatSar, halalasToSar, type Asset } from "@/lib/api";

const CATEGORIES = [
  { id: undefined, label: "All", icon: Diamond },
  { id: "handbag", label: "Bags", icon: Diamond },
  { id: "watch", label: "Watches", icon: Watch },
  { id: "dress", label: "Dresses", icon: Shirt },
  { id: "jewelry", label: "Jewelry", icon: Gem },
];

type SortOption = "newest" | "price_low" | "price_high" | "value_high";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "newest", label: "Newest First" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "value_high", label: "Value: High to Low" },
];

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100_000]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category],
    queryFn: () => assetsApi.listings({ category, limit: 50 }),
  });

  const filtered = useMemo(() => {
    let items = data?.items ?? [];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a: Asset) =>
        `${a.brand} ${a.title} ${a.model ?? ""} ${a.description ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (priceRange[0] > 0 || priceRange[1] < 100_000) {
      items = items.filter((a: Asset) => {
        const daily = halalasToSar(a.dailyRentalPriceHalalas);
        return daily >= priceRange[0] && daily <= priceRange[1];
      });
    }

    switch (sort) {
      case "price_low":
        items = [...items].sort(
          (a, b) => (a.dailyRentalPriceHalalas ?? 0) - (b.dailyRentalPriceHalalas ?? 0)
        );
        break;
      case "price_high":
        items = [...items].sort(
          (a, b) => (b.dailyRentalPriceHalalas ?? 0) - (a.dailyRentalPriceHalalas ?? 0)
        );
        break;
      case "value_high":
        items = [...items].sort(
          (a, b) => (b.evaluatedValueHalalas ?? 0) - (a.evaluatedValueHalalas ?? 0)
        );
        break;
      case "newest":
      default:
        items = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return items;
  }, [data?.items, search, sort, priceRange]);

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
              placeholder="Search brand, model, title…"
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
            <div className="flex border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
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
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="flex-1">
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Sort By</label>
              <div className="flex gap-2 flex-wrap">
                {SORT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.id}
                    variant={sort === opt.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSort(opt.id)}
                    className={sort === opt.id ? "bg-amber-500 text-neutral-950 hover:bg-amber-600" : ""}
                  >
                    {sort === opt.id && <ArrowUpDown className="w-3 h-3 mr-1" />}
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="w-full md:w-64">
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                Daily Price Range (SAR)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ""}
                  onChange={(e) =>
                    setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                  }
                  className="w-24"
                />
                <span className="text-neutral-400">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] === 100_000 ? "" : priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], parseInt(e.target.value) || 100_000])
                  }
                  className="w-24"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-500">
          {isLoading ? "Loading…" : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {isLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={viewMode === "grid" ? "h-80 rounded-xl bg-neutral-100 animate-pulse" : "h-32 rounded-xl bg-neutral-100 animate-pulse"}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <Diamond className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p className="text-lg font-medium">No assets match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === "grid" ? (
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
      ) : (
        <div className="space-y-3">
          {filtered.map((asset) => (
            <Link key={asset.id} href={`/browse/${asset.id}`}>
              <a>
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex">
                    <div className="w-32 h-32 bg-neutral-100 shrink-0 flex items-center justify-center">
                      {asset.studioImagesJson?.[0] || asset.submissionImagesJson?.[0] ? (
                        <img
                          src={asset.studioImagesJson[0] || asset.submissionImagesJson[0]}
                          alt={asset.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Diamond className="w-8 h-8 text-neutral-300" />
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
                            {asset.brand}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {asset.category}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mt-1">{asset.title}</h3>
                        {asset.model && (
                          <p className="text-sm text-neutral-500">{asset.model}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-amber-600 font-bold">
                          {formatSar(asset.dailyRentalPriceHalalas)}
                        </p>
                        <p className="text-xs text-neutral-500">per day</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          Value {formatSar(asset.evaluatedValueHalalas)}
                        </p>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
