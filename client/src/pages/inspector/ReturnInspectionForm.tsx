import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Plus, X } from "lucide-react";
import Layout from "@/components/Layout";
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
import { Badge } from "@/components/ui/badge";
import { rentalsApi, inspectionsApi, formatSar } from "@/lib/api";
import { formatDate, getStatusLabel } from "@/lib/utils";

type Grade = "A" | "B" | "C" | "D";
type Risk = "low" | "medium" | "high" | "ultra_high";

export default function ReturnInspectionForm({
  rentalId,
}: {
  rentalId: number;
}) {
  const [, navigate] = useLocation();

  const [authenticityVerified, setAuthenticityVerified] = useState(true);
  const [conditionScore, setConditionScore] = useState(92);
  const [conditionGrade, setConditionGrade] = useState<Grade>("A");
  const [conditionNotes, setConditionNotes] = useState("");
  const [marketValueSar, setMarketValueSar] = useState("");
  const [recommendedDailySar, setRecommendedDailySar] = useState("");
  const [riskCategory, setRiskCategory] = useState<Risk>("medium");
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [beforeUrlInput, setBeforeUrlInput] = useState("");
  const [afterUrlInput, setAfterUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const { data: rentalData, isLoading: rentalLoading } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  const rental = rentalData?.rental;

  function addUrl(
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList((prev) => [...prev, trimmed]);
      setInput("");
    }
  }

  function removeUrl(
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) {
    setList((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUrlKeyDown(
    e: React.KeyboardEvent,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl(list, setList, input, setInput);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rental) {
      setError("Rental data not loaded yet");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const marketValueHalalas = Math.round(Number(marketValueSar) * 100);
      const recommendedDailyPriceHalalas = Math.round(
        Number(recommendedDailySar) * 100
      );
      if (!marketValueHalalas || !recommendedDailyPriceHalalas) {
        throw new Error("Market value and daily price are required");
      }
      const result = await inspectionsApi.createReturn({
        assetId: rental.assetId,
        rentalId,
        authenticityVerified,
        conditionScore,
        conditionGrade,
        conditionNotes: conditionNotes || undefined,
        marketValueHalalas,
        recommendedDailyPriceHalalas,
        riskCategory,
        beforeImages: beforeImages.length > 0 ? beforeImages : undefined,
        afterImages: afterImages.length > 0 ? afterImages : undefined,
      });
      if (result.hint) {
        setHint(result.hint);
        // Allow the inspector to read the hint before navigating
        setTimeout(() => navigate("/inspector"), 3000);
      } else {
        navigate("/inspector");
      }
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function UrlListInput({
    label,
    urls,
    setUrls,
    urlInput,
    setUrlInput,
  }: {
    label: string;
    urls: string[];
    setUrls: React.Dispatch<React.SetStateAction<string[]>>;
    urlInput: string;
    setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  }) {
    return (
      <div>
        <Label className="mb-2 block">{label}</Label>
        <div className="flex gap-2 mb-2">
          <Input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) =>
              handleUrlKeyDown(e, urls, setUrls, urlInput, setUrlInput)
            }
            placeholder="https://..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addUrl(urls, setUrls, urlInput, setUrlInput)}
            disabled={!urlInput.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {urls.length > 0 && (
          <ul className="space-y-1">
            {urls.map((url, i) => (
              <li
                key={i}
                className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-sm"
              >
                <span className="flex-1 truncate">{url}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(setUrls, i)}
                  className="text-neutral-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
          <ClipboardCheck className="w-4 h-4" />
          Return inspection
        </div>
        <h1 className="text-3xl font-bold mb-1">Return inspection report</h1>
        <p className="text-neutral-500 mb-8">
          Inspect the returned asset and submit your findings.
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
                  {formatDate(rental.startDate)} &ndash;{" "}
                  {formatDate(rental.endDate)}
                </div>
                <div>
                  <span className="text-neutral-500">Total:</span>{" "}
                  <span className="font-medium">
                    {formatSar(rental.totalPayableHalalas)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600">
                Could not load rental details.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Hint banner */}
        {hint && (
          <div className="mb-6 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-4">
            <strong>Inspection submitted.</strong> {hint}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Authenticity */}
              <section>
                <h2 className="font-semibold mb-3">Authenticity</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={authenticityVerified}
                      onChange={() => setAuthenticityVerified(true)}
                    />
                    Genuine
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={!authenticityVerified}
                      onChange={() => setAuthenticityVerified(false)}
                    />
                    Counterfeit / suspicious
                  </label>
                </div>
              </section>

              {/* Condition */}
              <section>
                <h2 className="font-semibold mb-3">Condition</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Condition score (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={conditionScore}
                      onChange={(e) =>
                        setConditionScore(Number(e.target.value))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Grade</Label>
                    <Select
                      value={conditionGrade}
                      onValueChange={(v) => setConditionGrade(v as Grade)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A -- pristine</SelectItem>
                        <SelectItem value="B">B -- minor wear</SelectItem>
                        <SelectItem value="C">C -- visible wear</SelectItem>
                        <SelectItem value="D">D -- damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="Scratches, scuffs, missing accessories..."
                  rows={3}
                  className="mt-3"
                />
              </section>

              {/* Valuation & pricing */}
              <section>
                <h2 className="font-semibold mb-3">Valuation & pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Market value (SAR)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={marketValueSar}
                      onChange={(e) => setMarketValueSar(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Recommended daily rental (SAR)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={recommendedDailySar}
                      onChange={(e) => setRecommendedDailySar(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Risk assessment */}
              <section>
                <h2 className="font-semibold mb-3">Risk assessment</h2>
                <Select
                  value={riskCategory}
                  onValueChange={(v) => setRiskCategory(v as Risk)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="ultra_high">Ultra high</SelectItem>
                  </SelectContent>
                </Select>
              </section>

              {/* Image URLs */}
              <section>
                <h2 className="font-semibold mb-3">Images (optional)</h2>
                <div className="space-y-4">
                  <UrlListInput
                    label="Before images"
                    urls={beforeImages}
                    setUrls={setBeforeImages}
                    urlInput={beforeUrlInput}
                    setUrlInput={setBeforeUrlInput}
                  />
                  <UrlListInput
                    label="After images"
                    urls={afterImages}
                    setUrls={setAfterImages}
                    urlInput={afterUrlInput}
                    setUrlInput={setAfterUrlInput}
                  />
                </div>
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
              disabled={submitting || !!hint}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {submitting ? "Submitting..." : "Submit return inspection"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/inspector")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
