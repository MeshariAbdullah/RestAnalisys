import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  BadgeCheck,
  AlertTriangle,
  Phone,
  Mail,
  Fingerprint,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User as UserType } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { saveSession } from "@/lib/auth";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  ultra_high: "bg-red-100 text-red-800",
};

const KYC_COLORS: Record<string, string> = {
  unverified: "bg-neutral-100 text-neutral-600",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!nationalId.trim()) return;
    setVerifying(true);
    try {
      const res = await authApi.nafathVerify(nationalId);
      if (res.status === "verified") {
        toast("success", "Nafath identity verified successfully");
        queryClient.invalidateQueries({ queryKey: ["me"] });
        const updated = await authApi.me();
        const token = localStorage.getItem("auth_token");
        if (token) saveSession(token, updated);
      } else {
        toast("info", `Nafath verification status: ${res.status}`);
      }
    } catch (err) {
      toast("error", (err as Error).message ?? "Nafath verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">
        Manage your account and identity verification
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-neutral-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{user.fullName}</h2>
                  <p className="text-neutral-500 capitalize">{user.role.replace("_", " ")}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className={KYC_COLORS[user.kycStatus]}>
                      KYC: {user.kycStatus}
                    </Badge>
                    <Badge className={RISK_COLORS[user.riskCategory]}>
                      Risk: {user.riskCategory}
                    </Badge>
                    {user.nafathVerified && (
                      <Badge className="bg-green-100 text-green-700">
                        <BadgeCheck className="w-3 h-3 mr-1" />
                        Nafath Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Account Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Email</p>
                  <p className="font-medium mt-1">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Phone</p>
                  <p className="font-medium mt-1">{user.phoneE164 || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">National ID</p>
                  <p className="font-medium mt-1">{user.nationalId || "Not linked"}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Role</p>
                  <p className="font-medium mt-1 capitalize">{user.role.replace("_", " ")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nafath verification */}
          {!user.nafathVerified && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Identity Verification Required
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                      Verify your identity via Nafath to unlock booking and
                      contract signing. This links your national ID to your
                      account.
                    </p>
                  </div>
                </div>
                <form onSubmit={handleNafathVerify} className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-amber-800">
                      National ID / Iqama Number
                    </Label>
                    <Input
                      placeholder="e.g. 1234567890"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={verifying}
                    className="self-end bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    <Fingerprint className="w-4 h-4 mr-2" />
                    {verifying ? "Verifying..." : "Verify via Nafath"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side stats */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Trust Score</p>
                  <p className="text-2xl font-bold">{user.trustScore}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${user.trustScore}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Score increases with successful rentals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h4 className="text-xs text-neutral-500 uppercase mb-3">
                Verification Status
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" /> Nafath
                  </span>
                  {user.nafathVerified ? (
                    <BadgeCheck className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </span>
                  <BadgeCheck className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phone
                  </span>
                  {user.phoneE164 ? (
                    <BadgeCheck className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase">Risk Category</p>
                  <p className="text-lg font-bold capitalize">
                    {user.riskCategory.replace("_", " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
