import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
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
import { assetsApi, rentalsApi, inspectionsApi, formatSar } from "@/lib/api";

type Grade = "A" | "B" | "C" | "D";
type Risk = "low" | "medium" | "high" | "ultra_high";

export default function ReturnInspectionForm({
  rentalId,
}: {
  rentalId: number;
}) {
  const [, navigate] = useLocation();
  const [authenticityVerified, setAuthenticityVerified] = useState(true);
  const [conditionScore, setConditionScore] = useState(85);
  const [conditionGrade, setConditionGrade] = useState<Grade>("B");
  const [conditionNotes, setConditionNotes] = useState("");
  const [marketValueSar, setMarketValueSar] = useState("");
  const [recommendedDailySar, setRecommendedDailySar] = useState("");
  const [riskCategory, setRiskCategory] = useState<Risk>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ hint: string } | null>(null);

  const rentalQuery = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  const assetQuery = useQuery({
    queryKey: ["asset", rentalQuery.data?.rental.assetId],
    queryFn: () => assetsApi.get(rentalQuery.data!.rental.assetId),
    enabled: !!rentalQuery.data,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rentalQuery.data) return;
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
      const res = await inspectionsApi.createReturn({
        assetId: rentalQuery.data.rental.assetId,
        rentalId,
        authenticityVerified,
        conditionScore,
        conditionGrade,
        conditionNotes: conditionNotes || undefined,
        marketValueHalalas,
        recommendedDailyPriceHalalas,
        riskCategory,
      });
      setResult({ hint: res.hint });
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (rentalQuery.isLoading) return <div className="p-8">Loading…</div>;
  if (!rentalQuery.data)
    return <div className="p-8">Rental not found.</div>;

  const rental = rentalQuery.data.rental;
  const asset = assetQuery.data;

  if (result) {
    const hintColors: Record<string, string> = {
      clean: "bg-green-50 border-green-200 text-green-800",
      penalty: "bg-amber-50 border-amber-200 text-amber-800",
      major_damage: "bg-red-50 border-red-200 text-red-800",
      loss: "bg-red-100 border-red-300 text-red-900",
    };
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <RotateCcw className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-2xl font-bold mb-2">
              Return inspection submitted
            </h2>
            <div
              className={`inline-block px-4 py-2 rounded-lg border text-sm font-semibold mb-4 ${
                hintColors[result.hint] ?? "bg-neutral-100 text-neutral-700"
              }`}
            >
              Recommended outcome: {result.hint.replace(/_/g, " ")}
            </div>
            <p className="text-sm text-neutral-600 mb-6">
              Operations and admin can now close the rental based on this
              recommendation.
            </p>
            <Button
              onClick={() => navigate("/inspector")}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              Back to queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <RotateCcw className="w-4 h-4" />
        Return inspection · Rental {rental.reference}
      </div>
      <h1 className="text-3xl font-bold mb-1">
        {asset
          ? `${asset.brand} — ${asset.title}`
          : "Return inspection report"}
      </h1>
      <p className="text-neutral-500 mb-8">
        Inspect the returned item and grade post-rental condition.
      </p>

      {asset && (
        <Card className="mb-6 border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-neutral-500 uppercase">
                Pre-rental value
              </p>
              <p className="font-semibold">
                {formatSar(asset.evaluatedValueHalalas)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">
                Daily rental
              </p>
              <p className="font-semibold">
                {formatSar(asset.dailyRentalPriceHalalas)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">
                Rental period
              </p>
              <p className="font-semibold">{rental.durationDays} days</p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <section>
              <h2 className="font-semibold mb-3">Authenticity re-check</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={authenticityVerified}
                    onChange={() => setAuthenticityVerified(true)}
                  />
                  Confirmed genuine
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!authenticityVerified}
                    onChange={() => setAuthenticityVerified(false)}
                  />
                  Suspicious / swapped
                </label>
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-3">Post-rental condition</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Condition score (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={conditionScore}
                    onChange={(e) => setConditionScore(Number(e.target.value))}
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
                      <SelectItem value="A">A — pristine</SelectItem>
                      <SelectItem value="B">B — minor wear</SelectItem>
                      <SelectItem value="C">C — visible wear</SelectItem>
                      <SelectItem value="D">D — damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Describe any damage, missing accessories, stains…"
                rows={4}
                className="mt-3"
              />
            </section>

            <section>
              <h2 className="font-semibold mb-3">
                Post-rental valuation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current market value (SAR)</Label>
                  <Input
                    type="number"
                    min="0"
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
                    min="0"
                    value={recommendedDailySar}
                    onChange={(e) => setRecommendedDailySar(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </section>

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
            {submitting ? "Submitting…" : "Submit return inspection"}
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
  );
}
