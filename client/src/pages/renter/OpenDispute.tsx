import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";

type DisputeCategory = "damage" | "loss" | "fraud" | "service" | "billing";

export default function OpenDispute({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<DisputeCategory>("service");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rentalData } = useQuery({
    queryKey: ["rental", rentalId],
    queryFn: () => rentalsApi.get(rentalId),
  });

  const rental = rentalData?.rental;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (summary.length < 10) {
      setError("Please provide at least 10 characters describing the issue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await disputesApi.open({ rentalId, category, summary });
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <AlertTriangle className="w-4 h-4" />
        Open a dispute
      </div>
      <h1 className="text-3xl font-bold mb-2">Report an issue</h1>
      <p className="text-neutral-500 mb-6">
        Describe your concern and our team will investigate promptly.
      </p>

      {rental && (
        <Card className="mb-6 border-blue-200 bg-blue-50/40">
          <CardContent className="p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-100 text-blue-700 border-0">
                {rental.reference}
              </Badge>
              <Badge variant="outline">
                {rental.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p>
              {rental.startDate} → {rental.endDate} · Total:{" "}
              <b>{formatSar(rental.totalPayableHalalas)}</b>
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Issue category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DisputeCategory)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">
                    Damage — item arrived damaged
                  </SelectItem>
                  <SelectItem value="loss">
                    Loss — item lost during shipping
                  </SelectItem>
                  <SelectItem value="fraud">
                    Fraud — item not as described
                  </SelectItem>
                  <SelectItem value="service">
                    Service — poor experience or delays
                  </SelectItem>
                  <SelectItem value="billing">
                    Billing — incorrect charge or refund issue
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Describe the issue</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What happened? Include dates, amounts, or anything that helps us investigate…"
                rows={6}
                className="mt-1"
                required
              />
              <p className="text-xs text-neutral-500 mt-1">
                Minimum 10 characters
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
            disabled={submitting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {submitting ? "Submitting…" : "Submit dispute"}
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
