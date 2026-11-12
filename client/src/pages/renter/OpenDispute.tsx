import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, X } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";
import { formatDate, getStatusLabel } from "@/lib/utils";

type DisputeCategory = "damage" | "loss" | "fraud" | "service" | "billing";

const categoryLabels: Record<DisputeCategory, string> = {
  damage: "ضرر / تلف",
  loss: "فقدان",
  fraud: "احتيال",
  service: "خدمة",
  billing: "فوترة",
};

export default function OpenDispute({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();

  const [category, setCategory] = useState<DisputeCategory | "">("");
  const [summary, setSummary] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rentalData, isLoading: rentalLoading } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  function addUrl() {
    const trimmed = urlInput.trim();
    if (trimmed && !evidenceUrls.includes(trimmed)) {
      setEvidenceUrls((prev) => [...prev, trimmed]);
      setUrlInput("");
    }
  }

  function removeUrl(index: number) {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUrlKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Please select a dispute category");
      return;
    }
    if (!summary.trim()) {
      setError("Please describe the issue");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId,
        category,
        summary: summary.trim(),
        evidence: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      });
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  }

  const rental = rentalData?.rental;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
          <AlertTriangle className="w-4 h-4" />
          Open a dispute
        </div>
        <h1 className="text-3xl font-bold mb-1">File a dispute</h1>
        <p className="text-neutral-500 mb-8">
          Describe the issue and provide any supporting evidence.
        </p>

        {/* Rental context card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Rental details</h2>
            {rentalLoading ? (
              <p className="text-sm text-neutral-500">Loading rental info...</p>
            ) : rental ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">Reference:</span>{" "}
                  <span className="font-medium">{rental.reference}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Status:</span>{" "}
                  <Badge variant="outline">{getStatusLabel(rental.status)}</Badge>
                </div>
                <div>
                  <span className="text-neutral-500">Period:</span>{" "}
                  {formatDate(rental.startDate)} &ndash; {formatDate(rental.endDate)}
                </div>
                <div>
                  <span className="text-neutral-500">Total:</span>{" "}
                  <span className="font-medium">{formatSar(rental.totalPayableHalalas)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600">Could not load rental details.</p>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Category */}
              <section>
                <h2 className="font-semibold mb-3">Category</h2>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as DisputeCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(categoryLabels) as DisputeCategory[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {categoryLabels[key]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </section>

              {/* Summary */}
              <section>
                <h2 className="font-semibold mb-3">Summary</h2>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={5}
                  required
                />
              </section>

              {/* Evidence URLs */}
              <section>
                <h2 className="font-semibold mb-3">Evidence (optional)</h2>
                <p className="text-sm text-neutral-500 mb-3">
                  Add URLs to photos, videos, or documents that support your claim.
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleUrlKeyDown}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addUrl}
                    disabled={!urlInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {evidenceUrls.length > 0 && (
                  <ul className="space-y-2">
                    {evidenceUrls.map((url, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-sm"
                      >
                        <span className="flex-1 truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeUrl(i)}
                          className="text-neutral-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
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
              disabled={submitting}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {submitting ? "Submitting..." : "Open dispute"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/my-rentals")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
