import React, { useState } from "react";
import { useLocation } from "wouter";
import { Diamond, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assetsApi } from "@/lib/api";

export default function SubmitAsset() {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState("bag");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [declaredValueSar, setDeclaredValueSar] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageDraft, setImageDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addImage() {
    if (imageDraft && imageUrls.length < 10) {
      setImageUrls([...imageUrls, imageDraft]);
      setImageDraft("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const value = Math.round(Number(declaredValueSar) * 100);
      if (!value || value <= 0) {
        throw new Error("Declared value must be a positive number");
      }
      if (imageUrls.length === 0) {
        throw new Error("At least one photo is required");
      }
      await assetsApi.submit({
        category,
        brand,
        model: model || undefined,
        title,
        description: description || undefined,
        ownerDeclaredValueHalalas: value,
        submissionImages: imageUrls,
      });
      navigate("/owner");
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <Diamond className="w-4 h-4" />
        Submit asset
      </div>
      <h1 className="text-3xl font-bold mb-2">Submit a new asset</h1>
      <p className="text-neutral-500 mb-8">
        Tell us about your piece. Our experts will authenticate and evaluate it
        before listing.
      </p>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bag">Handbag</SelectItem>
                    <SelectItem value="watch">Watch</SelectItem>
                    <SelectItem value="dress">Dress / couture</SelectItem>
                    <SelectItem value="jewelry">Jewelry</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Declared value (SAR)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={declaredValueSar}
                  onChange={(e) => setDeclaredValueSar(e.target.value)}
                  placeholder="e.g. 180000"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Brand</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Hermès"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Model (optional)</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Birkin 30 Togo"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hermès Birkin 30 Gold Togo PHW"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Condition, history, accessories included…"
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>Photos</Label>
              <p className="text-xs text-neutral-500 mb-2">
                Paste image URLs (at least 1, up to 10). Proper uploads connect
                to S3 in production.
              </p>
              <div className="flex gap-2">
                <Input
                  value={imageDraft}
                  onChange={(e) => setImageDraft(e.target.value)}
                  placeholder="https://…/photo.jpg"
                />
                <Button type="button" onClick={addImage} variant="outline">
                  <Upload className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-square bg-neutral-100 rounded overflow-hidden border"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls(imageUrls.filter((_, j) => j !== i))
                        }
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            type="submit"
            disabled={loading}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {loading ? "Submitting…" : "Submit for inspection"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/owner")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
