import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assetsApi, inspectionsApi, formatSar } from "@/lib/api";

type Grade = "A" | "B" | "C" | "D";
type Risk = "low" | "medium" | "high" | "ultra_high";

export default function InspectionForm({ assetId }: { assetId: number }) {
  const [, navigate] = useLocation();
  const [authenticityVerified, setAuthenticityVerified] = useState(true);
  const [authenticityNotes, setAuthenticityNotes] = useState("");
  const [conditionScore, setConditionScore] = useState(92);
  const [conditionGrade, setConditionGrade] = useState<Grade>("A");
  const [conditionNotes, setConditionNotes] = useState("");
  const [marketValueSar, setMarketValueSar] = useState("");
  const [recommendedDailySar, setRecommendedDailySar] = useState("");
  const [riskCategory, setRiskCategory] = useState<Risk>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: asset } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => assetsApi.get(assetId),
  });

  const isReturn = asset?.status === "returned_under_inspection";

  const { data: rental } = useQuery({
    queryKey: ["active-rental", assetId],
    queryFn: () => inspectionsApi.activeRental(assetId),
    enabled: isReturn,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      if (isReturn && rental) {
        await inspectionsApi.createReturn({
          assetId,
          rentalId: rental.id,
          authenticityVerified,
          conditionScore,
          conditionGrade,
          conditionNotes: conditionNotes || undefined,
          marketValueHalalas,
          recommendedDailyPriceHalalas,
          riskCategory,
        });
      } else {
        await inspectionsApi.createIntake({
          assetId,
          authenticityVerified,
          authenticityNotes: authenticityNotes || undefined,
          conditionScore,
          conditionGrade,
          conditionNotes: conditionNotes || undefined,
          marketValueHalalas,
          recommendedDailyPriceHalalas,
          riskCategory,
        });
      }
      navigate("/inspector");
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        {isReturn ? (
          <RotateCcw className="w-4 h-4" />
        ) : (
          <ClipboardCheck className="w-4 h-4" />
        )}
        {isReturn ? "Return inspection" : "Intake inspection"}
      </div>
      <h1 className="text-3xl font-bold mb-1">
        {asset ? `${asset.brand} — ${asset.title}` : "Inspection report"}
      </h1>
      <p className="text-neutral-500 mb-4">
        {isReturn
          ? "Inspect the returned asset for damage, loss or wear."
          : "Authenticate, grade and valuate the asset."}
      </p>

      {isReturn && rental && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">
                  Return for rental
                </p>
                <p className="font-semibold mt-0.5">{rental.reference}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-neutral-500">
                  {rental.startDate} → {rental.endDate}
                </p>
                <Badge variant="outline" className="mt-1">
                  {rental.durationDays} days &middot; {formatSar(rental.dailyPriceHalalas)}/day
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <section>
              <h2 className="font-semibold mb-3">Authenticity</h2>
              <div className="flex items-center gap-4 mb-3">
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
              <Textarea
                value={authenticityNotes}
                onChange={(e) => setAuthenticityNotes(e.target.value)}
                placeholder="Serial, hologram, stitching notes…"
                rows={3}
              />
            </section>

            <section>
              <h2 className="font-semibold mb-3">Condition</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Condition score (0–100)</Label>
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
                placeholder={
                  isReturn
                    ? "Compare against intake report. Note new scratches, scuffs, missing accessories…"
                    : "Scratches, scuffs, missing accessories…"
                }
                rows={3}
                className="mt-3"
              />
            </section>

            <section>
              <h2 className="font-semibold mb-3">Valuation & pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    {isReturn ? "Current market value (SAR)" : "Market value (SAR)"}
                  </Label>
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
            disabled={submitting || (isReturn && !rental)}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {submitting
              ? "Submitting…"
              : isReturn
                ? "Submit return inspection"
                : "Submit intake inspection"}
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
