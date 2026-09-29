import React, { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Fingerprint, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function NafathVerification() {
  const [, navigate] = useLocation();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const user = getCurrentUser();
  const alreadyVerified = user?.nafathVerified;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!nationalId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.nafathVerify(nationalId);
      const updated = await authApi.me();
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (alreadyVerified || success) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Identity verified</h1>
        <p className="text-neutral-500 mb-6">
          Your Nafath identity verification is complete. You can now create rentals
          and sign contracts.
        </p>
        <Button onClick={() => navigate("/browse")} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
          Browse the collection
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <ShieldCheck className="w-4 h-4" />
        Identity verification
      </div>
      <h1 className="text-3xl font-bold mb-2">Verify with Nafath</h1>
      <p className="text-neutral-500 mb-8">
        Saudi law requires identity verification before you can rent luxury items.
        This verification uses the Nafath national identity system.
      </p>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Fingerprint className="w-6 h-6 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              Enter your National ID (Iqama) number. You will be prompted to
              verify via the Nafath app on your phone.
            </p>
          </div>

          <form onSubmit={handleVerify}>
            <div className="space-y-4">
              <div>
                <Label>National ID / Iqama number</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="e.g. 1000000000"
                  className="mt-1"
                  required
                  pattern="[0-9]{10}"
                  title="Enter a 10-digit ID number"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !nationalId.trim()}
                className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {loading ? "Verifying via Nafath…" : "Verify my identity"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
