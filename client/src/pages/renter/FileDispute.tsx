import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Send } from "lucide-react";
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
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";

const CATEGORIES = [
  { value: "damage", label: "Damage to item" },
  { value: "loss", label: "Item lost" },
  { value: "fraud", label: "Fraud / misrepresentation" },
  { value: "service", label: "Service issue" },
  { value: "billing", label: "Billing / payment issue" },
] as const;

export default function FileDispute({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: rentalData } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId,
        category: category as "damage" | "loss" | "fraud" | "service" | "billing",
        summary,
        evidence: evidence.trim()
          ? evidence.split("\n").filter((l) => l.trim())
          : undefined,
      }),
    onSuccess: () => navigate(`/my-rentals/${rentalId}`),
    onError: (err: Error) => setError(err.message),
  });

  const rental = rentalData?.rental;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(`/my-rentals/${rentalId}`)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to rental
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">File a dispute</h1>
          {rental && (
            <p className="text-sm text-neutral-500">
              Rental {rental.reference} &middot;{" "}
              {formatSar(rental.totalPayableHalalas)}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select dispute category" />
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
              className="mt-1.5"
              rows={4}
              placeholder="Describe the issue in detail..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div>
            <Label>Evidence URLs (one per line, optional)</Label>
            <Textarea
              className="mt-1.5"
              rows={3}
              placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button
            onClick={() => mutation.mutate()}
            disabled={!category || !summary.trim() || mutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Submitting..." : "Submit dispute"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
