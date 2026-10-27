import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { rentalsApi, disputesApi, type Rental } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "damage", label: "Damage" },
  { value: "loss", label: "Loss" },
  { value: "fraud", label: "Fraud" },
  { value: "service", label: "Service" },
  { value: "billing", label: "Billing" },
] as const;

export default function OpenDispute() {
  const [, navigate] = useLocation();
  const [rentalId, setRentalId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");

  const rentalsQuery = useQuery({
    queryKey: ["rentals-mine"],
    queryFn: () => rentalsApi.mine(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId: Number(rentalId),
        category: category as "damage" | "loss" | "fraud" | "service" | "billing",
        summary,
        evidence: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Dispute opened",
        description: "Your dispute has been submitted for review.",
      });
      navigate("/my-rentals");
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to open dispute",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function addUrl() {
    const trimmed = newUrl.trim();
    if (trimmed) {
      setEvidenceUrls((prev) => [...prev, trimmed]);
      setNewUrl("");
    }
  }

  function removeUrl(index: number) {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = rentalId && category && summary.trim().length > 0;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Open a Dispute</h1>
      <p className="text-neutral-500 mb-8">
        Report an issue with a rental. Our team will review and respond.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Dispute Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rental select */}
          <div className="space-y-2">
            <Label>Rental</Label>
            <Select value={rentalId} onValueChange={setRentalId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rental" />
              </SelectTrigger>
              <SelectContent>
                {(rentalsQuery.data ?? []).map((r: Rental) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.reference} ({r.startDate} - {r.endDate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
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

          {/* Summary */}
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={5}
            />
          </div>

          {/* Evidence URLs */}
          <div className="space-y-2">
            <Label>Evidence URLs (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addUrl}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {evidenceUrls.length > 0 && (
              <div className="space-y-1 mt-2">
                {evidenceUrls.map((url, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-neutral-50 rounded px-3 py-1.5"
                  >
                    <span className="flex-1 truncate font-mono text-xs">{url}</span>
                    <button
                      onClick={() => removeUrl(i)}
                      className="text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Submitting..." : "Submit Dispute"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
