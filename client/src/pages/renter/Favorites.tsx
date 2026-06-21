import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Diamond, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { favoritesApi, formatSar, type FavoriteItem } from "@/lib/api";

export default function Favorites() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (assetId: number) => favoritesApi.remove(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
      <p className="text-neutral-500 mb-8">
        Items you've saved for later.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Heart className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>Your wishlist is empty.</p>
            <a
              href="/browse"
              className="text-amber-600 hover:underline text-sm mt-2 inline-block"
            >
              Browse the collection →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((fav: FavoriteItem) => {
            const asset = fav.asset;
            return (
              <Card key={fav.id} className="overflow-hidden group">
                <Link href={`/browse/${asset.id}`}>
                  <a>
                    <div className="aspect-square bg-neutral-100 relative flex items-center justify-center">
                      {(asset.studioImagesJson as string[])?.[0] ||
                      (asset.submissionImagesJson as string[])?.[0] ? (
                        <img
                          src={
                            (asset.studioImagesJson as string[])[0] ||
                            (asset.submissionImagesJson as string[])[0]
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
                  </a>
                </Link>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
                    {asset.brand}
                  </p>
                  <h3 className="font-semibold text-lg mt-1 line-clamp-1">
                    {asset.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-amber-600 font-bold">
                      {formatSar(asset.dailyRentalPriceHalalas)}
                      <span className="text-xs font-normal text-neutral-500">
                        {" "} / day
                      </span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        removeMutation.mutate(asset.id);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
