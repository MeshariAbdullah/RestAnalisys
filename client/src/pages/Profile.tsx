import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  ShieldCheck,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function Profile() {
  const qc = useQueryClient();
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const u = await authApi.me();
      setCurrentUser(u);
      return u;
    },
  });

  async function handleNafathVerify() {
    if (!nationalId.match(/^[12]\d{9}$/)) {
      setError("National ID must be 10 digits starting with 1 or 2");
      return;
    }
    setVerifying(true);
    setError(null);
    setVerifyResult(null);
    try {
      const res = await authApi.nafathVerify(nationalId);
      setVerifyResult(res.status);
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <UserIcon className="w-4 h-4" />
        My profile
      </div>
      <h1 className="text-3xl font-bold mb-8">Account settings</h1>

      {/* Profile info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-8 h-8 text-neutral-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <p className="text-neutral-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {user.role.replace(/_/g, " ")}
                </Badge>
                <Badge className={`border-0 ${riskColor(user.riskCategory)}`}>
                  Risk: {user.riskCategory}
                </Badge>
                {user.isBlocked && (
                  <Badge className="bg-red-100 text-red-700 border-0">
                    Blocked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification status */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Verification status
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">KYC</span>
                <Badge
                  className={`border-0 ${
                    user.kycStatus === "verified"
                      ? "bg-green-100 text-green-700"
                      : user.kycStatus === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : user.kycStatus === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {user.kycStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Nafath verified</span>
                {user.nafathVerified ? (
                  <BadgeCheck className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              {user.nationalId && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">National ID</span>
                  <span className="font-mono text-xs">
                    {user.nationalId.slice(0, 3)}****{user.nationalId.slice(-3)}
                  </span>
                </div>
              )}
              {user.phoneE164 && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Phone</span>
                  <span className="font-mono text-xs">{user.phoneE164}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Trust score
            </h3>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-amber-600">
                {user.trustScore}
              </p>
              <p className="text-sm text-neutral-500 mt-2">out of 100</p>
            </div>
            <p className="text-xs text-neutral-500 text-center mt-2">
              Score improves with completed rentals and on-time returns.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Nafath verification */}
      {!user.nafathVerified && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Verify with Nafath
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Nafath verification is required to rent or list assets. Enter your
              Saudi National ID to start the verification process.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs">National ID</Label>
                <Input
                  placeholder="1XXXXXXXXX"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  maxLength={10}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleNafathVerify}
                disabled={verifying || !nationalId}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400 self-end"
              >
                {verifying ? "Verifying…" : "Verify"}
              </Button>
            </div>
            {verifyResult && (
              <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                Verification status: {verifyResult}
              </div>
            )}
            {error && (
              <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
