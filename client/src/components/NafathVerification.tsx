import React, { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

interface Props {
  currentStatus: "unverified" | "pending" | "verified" | "rejected";
  onVerified?: () => void;
}

export default function NafathVerification({ currentStatus, onVerified }: Props) {
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; transactionId: string } | null>(null);

  const isValid = /^[12]\d{9}$/.test(nationalId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.nafathVerify(nationalId);
      setResult(res);
      if (res.status === "verified") {
        onVerified?.();
      }
    } catch (err) {
      setError((err as Error).message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === "verified" || result?.status === "verified") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Identity Verified</h3>
            <p className="text-sm text-green-700 mt-0.5">
              Your Nafath digital identity has been verified. You can now create
              rentals and sign legal commitments.
            </p>
          </div>
          <Badge className="ml-auto bg-green-600">Verified</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Nafath Identity Verification</h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              Saudi Digital Identity verification is required to rent luxury
              assets and sign legal commitments on the platform.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nationalId">National ID / Iqama Number</Label>
            <Input
              id="nationalId"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="e.g. 1098765432"
              className="mt-1.5"
              maxLength={10}
              pattern="[12]\d{9}"
              required
            />
            <p className="text-xs text-neutral-400 mt-1">
              10-digit number starting with 1 (citizen) or 2 (resident).
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {result && result.status === "pending" && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              Verification in progress. Check the Nafath app on your phone to
              confirm. Transaction: {result.transactionId}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !isValid}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify with Nafath
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
