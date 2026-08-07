import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  BadgeCheck,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getScoreBg } from "@/lib/utils";

function VerificationBadge({
  verified,
  label,
}: {
  verified: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
        verified
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-neutral-50 text-neutral-500 border border-neutral-200"
      }`}
    >
      {verified ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-neutral-400" />
      )}
      {label}
    </div>
  );
}

export default function Profile() {
  const qc = useQueryClient();
  const [nafathNationalId, setNafathNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: () => authApi.me(),
  });

  async function handleNafathVerify() {
    if (!nafathNationalId.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const res = await authApi.nafathVerify(nafathNationalId.trim());
      if (res.status === "verified") {
        setVerifyResult("Identity verified successfully via Nafath.");
        await qc.invalidateQueries({ queryKey: ["user-me"] });
      } else {
        setVerifyResult(`Verification status: ${res.status}`);
      }
    } catch (err) {
      setVerifyError((err as Error).message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading profile…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center">
          <User className="w-8 h-8 text-neutral-950" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.fullName}</h1>
          <p className="text-neutral-500">{user.email}</p>
        </div>
        <Badge className="ml-auto bg-neutral-900 text-white text-sm">
          {user.role.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Verification status
            </h2>
            <div className="space-y-3">
              <VerificationBadge
                verified={user.nafathVerified}
                label={
                  user.nafathVerified
                    ? "Nafath identity verified"
                    : "Nafath not verified"
                }
              />
              <VerificationBadge
                verified={user.kycStatus === "verified"}
                label={`KYC: ${user.kycStatus}`}
              />
              {user.phoneE164 && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Phone className="w-4 h-4" />
                  {user.phoneE164}
                </div>
              )}
              {user.nationalId && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <BadgeCheck className="w-4 h-4" />
                  National ID: ****{user.nationalId.slice(-4)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Trust & risk
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase mb-1">
                  Trust score
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${user.trustScore}%` }}
                    />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-semibold ${getScoreBg(
                      user.trustScore
                    )}`}
                  >
                    {user.trustScore}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-neutral-500 uppercase mb-1">
                  Risk category
                </p>
                <Badge
                  className={`border-0 ${
                    user.riskCategory === "low"
                      ? "bg-green-100 text-green-700"
                      : user.riskCategory === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : user.riskCategory === "high"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.riskCategory}
                </Badge>
              </div>

              {user.isBlocked && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  Account is currently blocked. Contact support.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!user.nafathVerified && (
          <Card className="md:col-span-2 border-amber-200 bg-amber-50/30">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-amber-600" />
                Verify your identity with Nafath
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Identity verification is required before you can book or list
                luxury assets. This connects to Saudi Arabia's national identity
                system.
              </p>
              <div className="flex gap-3 max-w-md">
                <div className="flex-1">
                  <Label className="text-xs">National ID / Iqama</Label>
                  <Input
                    placeholder="1xxxxxxxxx"
                    value={nafathNationalId}
                    onChange={(e) => setNafathNationalId(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleNafathVerify}
                  disabled={verifying || !nafathNationalId.trim()}
                  className="self-end bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {verifying ? "Verifying…" : "Verify via Nafath"}
                </Button>
              </div>
              {verifyResult && (
                <p className="text-sm text-green-700 mt-3">{verifyResult}</p>
              )}
              {verifyError && (
                <p className="text-sm text-red-700 mt-3">{verifyError}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
