import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Diamond,
  Watch,
  Shirt,
  Gem,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
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
import { assetsApi, formatSar, type Asset } from "@/lib/api";

const CATEGORIES = [
  { id: "all", label: "All", icon: Diamond },
  { id: "handbag", label: "Bags", icon: Diamond },
  { id: "watch", label: "Watches", icon: Watch },
  { id: "dress", label: "Dresses", icon: Shirt },
  { id: "jewelry", label: "Jewelry", icon: Gem },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export default function Browse() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  const serverCategory = category === "all" ? undefined : category;

  const { data, isLoading } = useQuery({
    queryKey: ["listings", serverCategory, sort, page],
    queryFn: () =>
      assetsApi.listings({ category: serverCategory, sort, page, limit: 18 }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const filtered = search
    ? items.filter((a: Asset) =>
        `${a.brand} ${a.title} ${a.model ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : items;

  function changeCategory(id: string) {
    setCategory(id);
    setPage(1);
  }

  function changeSort(value: string) {
    setSort(value as SortKey);
    setPage(1);
  }

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
            placeholder="Search brand, model, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={changeSort}>
          <SelectTrigger className="w-52">
            <ArrowUpDown className="w-4 h-4 mr-1.5 text-neutral-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((c) => (
          <Button
            key={c.id}
            variant={category === c.id ? "default" : "outline"}
            onClick={() => changeCategory(c.id)}
            className={category === c.id ? "bg-neutral-900 text-white" : ""}
            size="sm"
          >
            <c.icon className="w-4 h-4 mr-1.5" />
            {c.label}
          </Button>
        ))}
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((asset) => (
              <Link key={asset.id} href={`/browse/${asset.id}`}>
                <a>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="aspect-square bg-neutral-100 relative flex items-center justify-center">
                      {asset.studioImagesJson?.[0] ||
                      asset.submissionImagesJson?.[0] ? (
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
