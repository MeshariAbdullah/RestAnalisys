import React, { useState } from "react";
import { Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function NafathVerification({ onVerified }: { onVerified?: () => void } = {}) {
  const user = getCurrentUser();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (user?.nafathVerified) {
    return (
      <Card className="border-green-200 bg-green-50/40">
        <CardContent className="p-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Identity verified</p>
            <p className="text-sm text-green-800">
              Your Nafath identity verification is complete.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.nafathVerify(nationalId);
      if (result.status === "verified") {
        setSuccess(true);
        const token = localStorage.getItem("auth_token");
        if (token && user) {
          saveSession(token, { ...user, nafathVerified: true, kycStatus: "verified" });
        }
        onVerified?.();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50/40">
        <CardContent className="p-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Verification complete</p>
            <p className="text-sm text-green-800">
              Your identity has been verified via Nafath.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-600" />
          <p className="font-semibold text-amber-900">
            Verify your identity
          </p>
        </div>
        <p className="text-sm text-amber-800 mb-4">
          Nafath verification is required to rent items or sign legal
          commitments. Enter your National ID or Iqama number.
        </p>
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <Label className="text-amber-900">National ID / Iqama</Label>
            <Input
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="1XXXXXXXXX or 2XXXXXXXXX"
              pattern="^[12]\d{9}$"
              required
              className="mt-1"
            />
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {loading ? "Verifying..." : "Verify with Nafath"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
