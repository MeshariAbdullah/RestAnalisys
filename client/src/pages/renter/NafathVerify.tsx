import React, { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function NafathVerify() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState(getCurrentUser());
  const [nationalId, setNationalId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "pending" | "verified" | "error"
  >("idle");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user?.nafathVerified) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900">
              Identity verified
            </h2>
            <p className="text-green-700 mt-2">
              Your Nafath digital identity has been verified. You are eligible to
              rent luxury items.
            </p>
            <Button
              className="mt-6 bg-amber-500 text-neutral-950 hover:bg-amber-400"
              onClick={() => navigate("/browse")}
            >
              Browse the collection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!nationalId.trim()) return;
    setError(null);
    setStatus("pending");
    try {
      const result = await authApi.nafathVerify(nationalId.trim());
      setTransactionId(result.transactionId);
      setStatus("verified");
      const refreshed = await authApi.me();
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, refreshed);
      setUser(refreshed);
    } catch (err) {
      setStatus("error");
      setError((err as Error).message ?? "Verification failed");
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <ShieldCheck className="w-4 h-4" />
        Identity verification
      </div>
      <h1 className="text-3xl font-bold mb-2">Nafath verification</h1>
      <p className="text-neutral-500 mb-8">
        Verify your Saudi Digital Identity via Nafath to unlock the ability to
        rent luxury items. This is required by Saudi law for electronic
        promissory note (Sanad) issuance.
      </p>

      {status === "verified" ? (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900">
              Verification complete
            </h2>
            <p className="text-green-700 mt-2">
              Your identity has been verified successfully.
            </p>
            {transactionId && (
              <p className="text-xs text-green-600 mt-2 font-mono">
                Transaction: {transactionId}
              </p>
            )}
            <Button
              className="mt-6 bg-amber-500 text-neutral-950 hover:bg-amber-400"
              onClick={() => navigate("/browse")}
            >
              Start browsing
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                  maxLength={10}
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Enter your 10-digit Saudi national ID or Iqama number.
                </p>
              </div>

              <div className="bg-neutral-50 border rounded-lg p-4 text-sm text-neutral-600 space-y-2">
                <p className="font-semibold text-neutral-800">How it works:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Enter your National ID or Iqama number below</li>
                  <li>Open the Nafath app on your phone</li>
                  <li>Approve the authentication request</li>
                  <li>
                    Your identity will be verified and linked to your MLR
                    account
                  </li>
                </ol>
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
              disabled={status === "pending"}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {status === "pending" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify with Nafath
                </>
              )}
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
      )}
    </div>
  );
}
