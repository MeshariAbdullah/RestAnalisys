import React, { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle } from "lucide-react";
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
import { disputesApi } from "@/lib/api";

type DisputeCategory = "damage" | "loss" | "fraud" | "service" | "billing";

export default function OpenDispute({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<DisputeCategory>("service");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await disputesApi.open({
        rentalId,
        category,
        summary,
      });
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Failed to open dispute");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <AlertTriangle className="w-4 h-4" />
        Open a dispute
      </div>
      <h1 className="text-3xl font-bold mb-2">Report a problem</h1>
      <p className="text-neutral-500 mb-8">
        Describe the issue you experienced with rental #{rentalId}. Our team
        will investigate and respond within 48 hours.
      </p>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
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
                  <SelectItem value="damage">
                    Damage — item arrived damaged
                  </SelectItem>
                  <SelectItem value="loss">
                    Loss — item lost during rental
                  </SelectItem>
                  <SelectItem value="fraud">
                    Fraud — suspected fraud or misrepresentation
                  </SelectItem>
                  <SelectItem value="service">
                    Service — delivery, quality, or platform issue
                  </SelectItem>
                  <SelectItem value="billing">
                    Billing — incorrect charge or payment issue
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Describe the issue</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Please provide as much detail as possible…"
                rows={5}
                className="mt-1"
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
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? "Submitting…" : "Submit dispute"}
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
