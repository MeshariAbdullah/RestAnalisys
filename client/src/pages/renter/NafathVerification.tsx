import React, { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function NafathVerification() {
  const [, navigate] = useLocation();
  const currentUser = getCurrentUser();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.nafathVerify(nationalId);
      if (result.status === "verified") {
        setVerified(true);
        const me = await authApi.me();
        const token = localStorage.getItem("auth_token");
        if (token) saveSession(token, me);
      }
    } catch (err) {
      setError((err as Error).message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (currentUser?.nafathVerified || verified) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Identity verified</h2>
            <p className="text-neutral-500 mb-6">
              Your Nafath identity has been confirmed. You can now rent luxury
              items on the platform.
            </p>
            <Button
              onClick={() => navigate("/browse")}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              Browse the collection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <ShieldCheck className="w-4 h-4" />
        Identity verification
      </div>
      <h1 className="text-3xl font-bold mb-2">Verify your identity</h1>
      <p className="text-neutral-500 mb-8">
        Saudi regulations require Nafath identity verification before renting
        luxury items. Your National ID / Iqama number will be verified through
        the Nafath platform.
      </p>

      <form onSubmit={handleVerify}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>National ID / Iqama number</Label>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="e.g. 1234567890"
                className="mt-1"
                required
                pattern="^[12]\d{9}$"
                title="10-digit number starting with 1 or 2"
              />
              <p className="text-xs text-neutral-500 mt-1">
                10 digits, starting with 1 (Saudi) or 2 (resident)
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
            disabled={loading}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {loading ? "Verifying…" : "Verify with Nafath"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/browse")}
          >
            Skip for now
          </Button>
        </div>
      </form>
    </div>
  );
}
