import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
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
import { assetsApi, rentalsApi, inspectionsApi, formatSar } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type Grade = "A" | "B" | "C" | "D";
type Risk = "low" | "medium" | "high" | "ultra_high";

export default function ReturnInspectionForm({
  assetId,
  rentalId,
}: {
  assetId: number;
  rentalId: number;
}) {
  const [, navigate] = useLocation();
  const [authenticityVerified, setAuthenticityVerified] = useState(true);
  const [conditionScore, setConditionScore] = useState(80);
  const [conditionGrade, setConditionGrade] = useState<Grade>("B");
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

  const { data: rentalData } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  const { data: prevInspections } = useQuery({
    queryKey: ["inspections-asset", assetId],
    queryFn: () => inspectionsApi.forAsset(assetId),
  });

  const intakeInspection = prevInspections?.find((i) => i.type === "intake");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const marketValueHalalas = Math.round(Number(marketValueSar) * 100);
      const recommendedDailyPriceHalalas = Math.round(Number(recommendedDailySar) * 100);
      if (!marketValueHalalas || !recommendedDailyPriceHalalas) {
        throw new Error("Market value and daily price are required");
      }
      await inspectionsApi.createReturn({
        assetId,
        rentalId,
        authenticityVerified,
        conditionScore,
        conditionGrade,
        conditionNotes: conditionNotes || undefined,
        marketValueHalalas,
        recommendedDailyPriceHalalas,
        riskCategory,
      });
      toast({
        title: "Return inspection submitted",
        description: "The rental can now be closed by operations.",
        variant: "success",
      });
      navigate("/inspector");
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const rental = rentalData?.rental;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <RotateCcw className="w-4 h-4" />
        Return inspection
      </div>
      <h1 className="text-3xl font-bold mb-1">
        {asset ? `${asset.brand} — ${asset.title}` : "Return inspection"}
      </h1>
      <p className="text-neutral-500 mb-6">
        Inspect the returned item and compare against the intake report.
      </p>

      {(rental || intakeInspection) && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-3">Reference data</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {rental && (
                <>
                  <div>
                    <p className="text-neutral-500">Rental ref</p>
                    <p className="font-mono font-medium">{rental.reference}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Duration</p>
                    <p className="font-medium">{rental.durationDays} days</p>
                  </div>
                </>
              )}
              {intakeInspection && (
                <>
                  <div>
                    <p className="text-neutral-500">Intake grade</p>
                    <Badge variant="outline">{intakeInspection.conditionGrade}</Badge>
                  </div>
                  <div>
                    <p className="text-neutral-500">Intake score</p>
                    <p className="font-medium">{intakeInspection.conditionScore}/100</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Market value (intake)</p>
                    <p className="font-medium">{formatSar(intakeInspection.marketValueHalalas)}</p>
                  </div>
                </>
              )}
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
                  Genuine — matches intake record
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!authenticityVerified}
                    onChange={() => setAuthenticityVerified(false)}
                  />
                  Suspicious — possible swap
                </label>
              </div>
            </section>

            <section>
              <h2 className="font-semibold mb-3">Return condition</h2>
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
                  {intakeInspection && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Intake was {intakeInspection.conditionScore}/100.
                      {conditionScore < (intakeInspection.conditionScore ?? 0) - 10 && (
                        <span className="text-red-600 font-medium ml-1">
                          Significant degradation detected.
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Grade</Label>
                  <Select value={conditionGrade} onValueChange={(v) => setConditionGrade(v as Grade)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A — pristine</SelectItem>
                      <SelectItem value="B">B — minor wear</SelectItem>
                      <SelectItem value="C">C — visible wear / damage</SelectItem>
                      <SelectItem value="D">D — major damage / loss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Describe any damage, wear, stains, missing parts vs. intake condition..."
                rows={4}
                className="mt-3"
              />
            </section>

            <section>
              <h2 className="font-semibold mb-3">Updated valuation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current market value (SAR)</Label>
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
              <Select value={riskCategory} onValueChange={(v) => setRiskCategory(v as Risk)}>
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

            {conditionGrade === "D" && (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-800">
                Grade D indicates major damage or loss. After submitting, operations should close
                this rental with outcome <strong>major_damage</strong> or <strong>loss</strong>,
                which may trigger Sanad enforcement.
              </div>
            )}
            {conditionGrade === "C" && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
                Grade C indicates visible wear beyond normal use. Operations should consider a
                penalty closure for this rental.
              </div>
            )}
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
            {submitting ? "Submitting..." : "Submit return inspection"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/inspector")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
