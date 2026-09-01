import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { disputesApi, rentalsApi, type Rental } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

type DisputeCategory = "damage" | "loss" | "fraud" | "service" | "billing";

const CATEGORIES: { value: DisputeCategory; label: string }[] = [
  { value: "damage", label: "Damage claim" },
  { value: "loss", label: "Loss" },
  { value: "fraud", label: "Fraud / authentication dispute" },
  { value: "service", label: "Service issue" },
  { value: "billing", label: "Billing / payment issue" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function rentalLabel(r: Rental): string {
  return `${r.reference} — Rental #${r.id} (${r.startDate} to ${r.endDate})`;
}

export default function OpenDispute() {
  const [, navigate] = useLocation();
  const user = getCurrentUser();
  const isOwner = user?.role === "owner";

  const [rentalId, setRentalId] = useState<string>("");
  const [category, setCategory] = useState<DisputeCategory>("damage");
  const [severity, setSeverity] = useState("medium");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: rentals,
    isLoading: rentalsLoading,
    error: rentalsError,
  } = useQuery({
    queryKey: ["my-rentals"],
    queryFn: () => rentalsApi.mine(),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!rentalId) {
      setError("Please select a rental");
      return;
    }
    if (summary.trim().length < 20) {
      setError("Summary must be at least 20 characters");
      return;
    }

    setLoading(true);
    try {
      await disputesApi.open({
        rentalId: Number(rentalId),
        category,
        summary: summary.trim(),
      });
      navigate(isOwner ? "/owner" : "/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <AlertTriangle className="w-4 h-4" />
        {isOwner ? "Owner" : "Renter"} dispute
      </div>
      <h1 className="text-3xl font-bold mb-2">Open a dispute</h1>
      <p className="text-neutral-500 mb-8">
        If something went wrong with a rental, submit a dispute and our team
        will review it.
      </p>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Rental selector */}
            <div>
              <Label>Rental</Label>
              {rentalsLoading ? (
                <p className="mt-1 text-sm text-neutral-400">
                  Loading your rentals...
                </p>
              ) : rentalsError ? (
                <p className="mt-1 text-sm text-red-600">
                  Failed to load rentals
                </p>
              ) : !rentals || rentals.length === 0 ? (
                <p className="mt-1 text-sm text-neutral-400">
                  You have no rentals yet.
                </p>
              ) : (
                <Select value={rentalId} onValueChange={setRentalId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a rental" />
                  </SelectTrigger>
                  <SelectContent>
                    {rentals.map((r: Rental) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {rentalLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Category + Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as DisputeCategory)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <Label>Summary</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the issue in detail (at least 20 characters)..."
                className="mt-1"
                rows={5}
                required
              />
              <p className="text-xs text-neutral-400 mt-1">
                {summary.trim().length} / 20 minimum characters
              </p>
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
            disabled={loading || rentalsLoading}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {loading ? "Submitting..." : "Open dispute"}
            {!loading && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isOwner ? "/owner" : "/my-rentals")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
