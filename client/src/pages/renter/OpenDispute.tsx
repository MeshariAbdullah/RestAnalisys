import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";

type Category = "damage" | "loss" | "fraud" | "service" | "billing";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "damage", label: "Damage to item" },
  { id: "loss", label: "Item lost" },
  { id: "fraud", label: "Fraud / misrepresentation" },
  { id: "service", label: "Service issue" },
  { id: "billing", label: "Billing dispute" },
];

export default function OpenDispute({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<Category | "">("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    setSubmitting(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId,
        category: category as Category,
        summary,
      });
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  }

  const rental = data?.rental;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/my-rentals/${rentalId}`)}
        className="text-sm text-neutral-500 hover:text-neutral-700 mb-4 inline-block"
      >
        ← Back to rental
      </button>

      <div className="flex items-center gap-3 mb-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-medium">Open a dispute</span>
      </div>
      <h1 className="text-3xl font-bold mb-1">Report an Issue</h1>
      {rental && (
        <p className="text-neutral-500 mb-8">
          Rental {rental.reference} · {formatSar(rental.totalPayableHalalas)}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="mb-2 block">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Description</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the issue in detail (minimum 10 characters)…"
                rows={5}
                required
                minLength={10}
              />
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
            disabled={submitting || !category || summary.length < 10}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? "Submitting…" : "Submit dispute"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/my-rentals/${rentalId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
