import React, { useState } from "react";
import { useLocation } from "wouter";
import { Shield, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [verified, setVerified] = useState(false);

  const user = getCurrentUser();
  const alreadyVerified = user?.nafathVerified;

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

  if (alreadyVerified || verified) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Identity verified</h1>
            <p className="text-neutral-500 mb-6">
              Your Nafath identity has been successfully verified. You can now
              access all platform features.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <Shield className="w-4 h-4" />
        Identity verification
      </div>
      <h1 className="text-3xl font-bold mb-2">Verify with Nafath</h1>
      <p className="text-neutral-500 mb-8">
        We use the Saudi Digital Identity (Nafath) to verify your identity. This
        is required before you can sign contracts or book rentals.
      </p>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Label>Saudi National ID / Iqama number</Label>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="e.g. 1234567890"
                className="mt-1"
                pattern="^[12]\d{9}$"
                title="10-digit number starting with 1 or 2"
                required
              />
              <p className="text-xs text-neutral-500 mt-1">
                10 digits, starting with 1 (Saudi) or 2 (resident)
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-neutral-50 border rounded-md p-4 text-sm text-neutral-600">
              <p className="font-medium mb-1">How it works</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Enter your National ID or Iqama number above</li>
                <li>Open the Nafath app on your phone</li>
                <li>Approve the verification request</li>
                <li>Your identity is confirmed instantly</li>
              </ol>
              <p className="text-xs text-amber-600 mt-2">
                Dev mode: verification auto-approves without the Nafath app.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {loading ? "Verifying..." : "Verify identity"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
