import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  BadgeCheck,
  Phone,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

function riskColor(cat: string): string {
  if (cat === "low") return "bg-green-100 text-green-700";
  if (cat === "medium") return "bg-amber-100 text-amber-800";
  if (cat === "high") return "bg-red-100 text-red-700";
  return "bg-red-200 text-red-800";
}

function trustColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export default function Profile() {
  const qc = useQueryClient();
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  async function handleNafathVerify() {
    if (!nationalId.match(/^[12]\d{9}$/)) {
      setVerifyError("National ID must be 10 digits starting with 1 or 2");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const res = await authApi.nafathVerify(nationalId);
      setVerifyResult(
        `Verification initiated (${res.status}). Transaction: ${res.transactionId}`
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setVerifyError((err as Error).message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!user) return <div className="p-8">Not authenticated.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-neutral-500 mb-8">
        Account details, verification status and trust score.
      </p>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <p className="text-neutral-500 capitalize">{user.role.replace(/_/g, " ")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span>{user.email}</span>
              </div>
              {user.phoneE164 && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <span>{user.phoneE164}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <Shield className="w-4 h-4" />
                Trust score
              </div>
              <p className={`text-4xl font-bold ${trustColor(user.trustScore)}`}>
                {user.trustScore}
                <span className="text-lg text-neutral-400">/100</span>
              </p>
              <Badge className={`mt-2 border-0 ${riskColor(user.riskCategory)}`}>
                {user.riskCategory} risk
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <BadgeCheck className="w-4 h-4" />
                KYC status
              </div>
              <p className="text-xl font-bold capitalize mt-1">
                {user.kycStatus}
              </p>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  {user.nafathVerified ? (
                    <BadgeCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Nafath: {user.nafathVerified ? "Verified" : "Not verified"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {!user.nafathVerified && (
          <Card className="border-amber-300 bg-amber-50/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Verify your identity</h3>
              </div>
              <p className="text-sm text-amber-800 mb-4">
                Nafath verification is required to rent items. Enter your National
                ID (Iqama number) to begin.
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">National ID</Label>
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="1234567890"
                    maxLength={10}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleNafathVerify}
                  disabled={verifying}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400 self-end"
                >
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
              {verifyResult && (
                <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                  {verifyResult}
                </div>
              )}
              {verifyError && (
                <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  {verifyError}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
