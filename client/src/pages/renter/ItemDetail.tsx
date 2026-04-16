import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Diamond, Calendar, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { assetsApi, rentalsApi, formatSar } from "@/lib/api";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ItemDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const today = useMemo(() => toISODate(new Date()), []);
  const threeDaysOut = useMemo(
    () => toISODate(new Date(Date.now() + 3 * 86400000)),
    []
  );
  const weekOut = useMemo(
    () => toISODate(new Date(Date.now() + 10 * 86400000)),
    []
  );

  const [startDate, setStartDate] = useState(threeDaysOut);
  const [endDate, setEndDate] = useState(weekOut);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery address
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const assetQuery = useQuery({
    queryKey: ["asset", id],
    queryFn: () => assetsApi.listingDetail(id),
  });

  const quoteQuery = useQuery({
    queryKey: ["quote", id, startDate, endDate],
    queryFn: () => rentalsApi.quote(id, startDate, endDate),
    enabled: !!startDate && !!endDate && startDate < endDate,
  });

  async function handleBook() {
    if (!city || !district || !street) {
      setError("Please fill in the delivery address (city, district, street are required).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await rentalsApi.create({
        assetId: id,
        startDate,
        endDate,
        deliveryAddress: {
          city,
          district,
          street,
          buildingNumber: buildingNumber || undefined,
          postalCode: postalCode || undefined,
        },
      });
      navigate(`/legal/${res.legal.commitmentId}`);
    } catch (err) {
      setError((err as Error).message ?? "Unable to book");
    } finally {
      setCreating(false);
    }
  }

  if (assetQuery.isLoading) {
    return <div className="p-8">Loading…</div>;
  }
  if (!assetQuery.data) {
    return <div className="p-8">Asset not found.</div>;
  }

  const asset = assetQuery.data;
  const images = [
    ...(asset.studioImagesJson ?? []),
    ...(asset.submissionImagesJson ?? []),
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-neutral-100 rounded-xl overflow-hidden flex items-center justify-center">
            {images[0] ? (
              <img
                src={images[0]}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Diamond className="w-24 h-24 text-neutral-300" />
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3 mt-3">
              {images.slice(1, 5).map((src, i) => (
                <div
                  key={i}
                  className="aspect-square bg-neutral-100 rounded-md overflow-hidden"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-sm uppercase tracking-wider text-neutral-500 font-medium">
            {asset.brand}
          </p>
          <h1 className="text-3xl font-bold mt-1">{asset.title}</h1>
          {asset.model && (
            <p className="text-neutral-500 mt-1">{asset.model}</p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <Badge className="bg-amber-500 text-neutral-950">
              {asset.category}
            </Badge>
            <Badge variant="outline">Risk: {asset.riskCategory}</Badge>
            <Badge variant="outline">
              Evaluated {formatSar(asset.evaluatedValueHalalas)}
            </Badge>
          </div>

          <p className="mt-6 text-sm text-neutral-600 leading-relaxed">
            {asset.description ?? "A carefully inspected luxury item."}
          </p>

          <div className="flex items-center gap-2 text-sm text-neutral-500 mt-4 bg-neutral-50 rounded-md p-3 border">
            <Shield className="w-4 h-4 text-amber-500" />
            Every item is authenticated, insured and shipped by MLR operations.
          </div>

          {/* Booking card */}
          <Card className="mt-6 border-amber-100 bg-amber-50/30">
            <CardContent className="p-6">
              <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Book this item
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <Label className="text-xs">Start date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">End date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Delivery address */}
              <div className="border-t border-amber-200 pt-4 mt-4">
                <p className="text-xs font-semibold text-neutral-700 mb-2">Delivery Address</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label className="text-xs">City *</Label>
                    <Input
                      placeholder="e.g. Riyadh"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">District *</Label>
                    <Input
                      placeholder="e.g. Al Olaya"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Label className="text-xs">Street *</Label>
                  <Input
                    placeholder="e.g. King Fahd Road"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Building No.</Label>
                    <Input
                      placeholder="Optional"
                      value={buildingNumber}
                      onChange={(e) => setBuildingNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Postal Code</Label>
                    <Input
                      placeholder="Optional"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {quoteQuery.isLoading && (
                <p className="text-sm text-neutral-500">Getting quote…</p>
              )}
              {quoteQuery.data && (
                <div className="space-y-1.5 text-sm border-t border-amber-200 pt-4">
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      {formatSar(quoteQuery.data.dailyPriceHalalas)} ×{" "}
                      {quoteQuery.data.durationDays} days
                    </span>
                    <span>{formatSar(quoteQuery.data.rentalSubtotalHalalas)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Platform fee</span>
                    <span>{formatSar(quoteQuery.data.platformFeeHalalas)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>VAT 15%</span>
                    <span>{formatSar(quoteQuery.data.vatHalalas)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-amber-200">
                    <span>Total</span>
                    <span>{formatSar(quoteQuery.data.totalPayableHalalas)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleBook}
                disabled={creating || !quoteQuery.data}
                className="w-full mt-5 bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {creating ? "Reserving…" : "Reserve & sign contract"}
              </Button>
              <p className="text-[11px] text-neutral-500 text-center mt-2">
                You'll review the legal commitment and sign via Nafath before
                payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
