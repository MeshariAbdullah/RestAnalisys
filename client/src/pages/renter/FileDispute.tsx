import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { rentalsApi, disputesApi, formatSar, type Rental } from "@/lib/api";

interface Props {
  rentalId: number;
}

type Category = "damage" | "loss" | "fraud" | "service" | "billing";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "damage", label: "Damage" },
  { value: "loss", label: "Loss" },
  { value: "fraud", label: "Fraud" },
  { value: "service", label: "Service issue" },
  { value: "billing", label: "Billing issue" },
];

export default function FileDispute({ rentalId }: Props) {
  const [, navigate] = useLocation();

  // Rental context
  const [rental, setRental] = useState<Rental | null>(null);
  const [loadingRental, setLoadingRental] = useState(true);
  const [rentalError, setRentalError] = useState<string | null>(null);

  // Form fields
  const [category, setCategory] = useState<Category>("damage");
  const [summary, setSummary] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [evidenceDraft, setEvidenceDraft] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingRental(true);
    setRentalError(null);
    rentalsApi
      .get(rentalId)
      .then((data) => {
        if (!cancelled) setRental(data.rental);
      })
      .catch((err) => {
        if (!cancelled) setRentalError((err as Error).message ?? "Failed to load rental");
      })
      .finally(() => {
        if (!cancelled) setLoadingRental(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rentalId]);

  function addEvidence() {
    const url = evidenceDraft.trim();
    if (url && evidenceUrls.length < 20) {
      setEvidenceUrls([...evidenceUrls, url]);
      setEvidenceDraft("");
    }
  }

  function removeEvidence(index: number) {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!summary.trim()) {
        throw new Error("Summary is required");
      }
      await disputesApi.open({
        rentalId,
        category,
        summary: summary.trim(),
        evidence: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      });
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Failed to file dispute");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRental) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-neutral-500">Loading rental details...</p>
      </div>
    );
  }

  if (rentalError) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {rentalError}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <AlertTriangle className="w-4 h-4" />
        File a dispute
      </div>
      <h1 className="text-3xl font-bold mb-2">Open a dispute</h1>
      <p className="text-neutral-500 mb-8">
        Describe the issue with your rental. Our team will investigate and work
        toward a resolution.
      </p>

      {/* Rental context card */}
      {rental && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rental context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Reference</span>
                <p className="font-medium">{rental.reference}</p>
              </div>
              <div>
                <span className="text-neutral-500">Status</span>
                <p className="font-medium capitalize">{rental.status.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-neutral-500">Duration</span>
                <p className="font-medium">{rental.durationDays} days</p>
              </div>
              <div>
                <span className="text-neutral-500">Total</span>
                <p className="font-medium">{formatSar(rental.totalPayableHalalas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
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
              <Label>Summary</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="mt-1"
                rows={5}
                required
              />
            </div>

            <div>
              <Label>Evidence URLs</Label>
              <p className="text-xs text-neutral-500 mb-2">
                Add links to photos, documents, or screenshots that support your
                claim (optional, up to 20).
              </p>
              <div className="flex gap-2">
                <Input
                  value={evidenceDraft}
                  onChange={(e) => setEvidenceDraft(e.target.value)}
                  placeholder="https://..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEvidence();
                    }
                  }}
                />
                <Button type="button" onClick={addEvidence} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              {evidenceUrls.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {evidenceUrls.map((url, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm bg-neutral-50 border rounded px-3 py-2"
                    >
                      <span className="truncate flex-1">{url}</span>
                      <button
                        type="button"
                        onClick={() => removeEvidence(i)}
                        className="text-neutral-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
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
            disabled={submitting}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {submitting ? "Submitting..." : "File dispute"}
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
  );
}
