import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Diamond, Watch, Shirt, Gem, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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

type SortKey = "newest" | "price_asc" | "price_desc" | "value_asc" | "value_desc";

const PAGE_SIZE = 12;

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["listings", category],
    queryFn: () => assetsApi.listings({ category }),
  });

  const processed = useMemo(() => {
    let items = data?.items ?? [];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a: Asset) =>
        `${a.brand} ${a.title} ${a.model ?? ""}`.toLowerCase().includes(q)
      );
    }

    items = [...items].sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return (a.dailyRentalPriceHalalas ?? 0) - (b.dailyRentalPriceHalalas ?? 0);
        case "price_desc":
          return (b.dailyRentalPriceHalalas ?? 0) - (a.dailyRentalPriceHalalas ?? 0);
        case "value_asc":
          return (a.evaluatedValueHalalas ?? 0) - (b.evaluatedValueHalalas ?? 0);
        case "value_desc":
          return (b.evaluatedValueHalalas ?? 0) - (a.evaluatedValueHalalas ?? 0);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return items;
  }, [data, search, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, category]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">The Collection</h1>
        <p className="text-neutral-500 mt-1">
          Verified, inspected and ready to ship.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search brand, model, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-neutral-500">
          {processed.length} item{processed.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-neutral-400" />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="value_asc">Value: low to high</SelectItem>
              <SelectItem value="value_desc">Value: high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          No assets match your filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paged.map((asset) => (
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className={p === safePage ? "bg-neutral-900 text-white" : ""}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
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
