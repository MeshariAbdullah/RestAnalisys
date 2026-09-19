import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  Fingerprint,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User } from "@/lib/api";

function maskNationalId(id?: string): string {
  if (!id) return "---";
  if (id.length <= 4) return "****";
  return "****" + id.slice(-4);
}

function roleBadgeColor(role: User["role"]): string {
  switch (role) {
    case "admin":
    case "super_admin":
      return "bg-purple-900/60 text-purple-300 border-purple-700";
    case "inspector":
      return "bg-blue-900/60 text-blue-300 border-blue-700";
    case "operations":
      return "bg-cyan-900/60 text-cyan-300 border-cyan-700";
    case "owner":
      return "bg-amber-900/60 text-amber-300 border-amber-700";
    case "renter":
    default:
      return "bg-green-900/60 text-green-300 border-green-700";
  }
}

function kycBadge(status: User["kycStatus"]) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-900/60 text-green-300 border-green-700">Verified</Badge>;
    case "pending":
      return <Badge className="bg-amber-900/60 text-amber-300 border-amber-700">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-900/60 text-red-300 border-red-700">Rejected</Badge>;
    default:
      return <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700">Unverified</Badge>;
  }
}

function riskBadge(category: User["riskCategory"]) {
  switch (category) {
    case "low":
      return <Badge className="bg-green-900/60 text-green-300 border-green-700">Low</Badge>;
    case "medium":
      return <Badge className="bg-amber-900/60 text-amber-300 border-amber-700">Medium</Badge>;
    case "high":
      return <Badge className="bg-red-900/60 text-red-300 border-red-700">High</Badge>;
    case "ultra_high":
      return <Badge className="bg-red-900/80 text-red-200 border-red-600">Ultra High</Badge>;
    default:
      return <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700">{category}</Badge>;
  }
}

export default function Profile() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");
  const [showVerifyForm, setShowVerifyForm] = useState(false);

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!nationalId.trim()) return;

    setVerifying(true);
    setVerifyError("");
    setVerifySuccess("");

    try {
      const res = await authApi.nafathVerify(nationalId.trim());
      setVerifySuccess(
        `Verification initiated (Transaction: ${res.transactionId}, Status: ${res.status}). Please complete the Nafath prompt on your device.`
      );
      setShowVerifyForm(false);
      setNationalId("");

      // Refetch profile to pick up updated verification status
      const updatedUser = await authApi.me();
      const token = localStorage.getItem("auth_token");
      if (token) {
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setVerifyError((err as Error).message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-neutral-500 mb-8">Your account details</p>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <UserIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>Unable to load profile. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-neutral-500 mb-8">Your account details and verification status</p>

      {/* Personal information */}
      <Card className="mb-6 bg-neutral-900 border-neutral-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{user.fullName}</h2>
              <Badge className={`${roleBadgeColor(user.role)} mt-0.5`}>
                {user.role.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase">Email</p>
                <p className="text-sm text-neutral-200">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase">Phone</p>
                <p className="text-sm text-neutral-200">
                  {user.phoneE164 || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Fingerprint className="w-4 h-4 text-neutral-500 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase">National ID</p>
                <p className="text-sm text-neutral-200 font-mono">
                  {maskNationalId(user.nationalId)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification & trust */}
      <Card className="mb-6 bg-neutral-900 border-neutral-800">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Verification & Trust
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Nafath Verification</p>
              <div className="flex items-center gap-2">
                {user.nafathVerified ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <Badge className="bg-green-900/60 text-green-300 border-green-700">
                      Verified
                    </Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <Badge className="bg-neutral-800 text-neutral-400 border-neutral-700">
                      Not Verified
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">KYC Status</p>
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-neutral-500" />
                {kycBadge(user.kycStatus)}
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Trust Score</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-neutral-500" />
                <span className="text-2xl font-bold text-amber-500">
                  {user.trustScore}
                </span>
                <span className="text-xs text-neutral-500">/ 100</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 uppercase mb-1">Risk Category</p>
              {riskBadge(user.riskCategory)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nafath verification action */}
      {!user.nafathVerified && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-amber-500" />
              Nafath Identity Verification
            </h2>
            <p className="text-sm text-neutral-400 mb-4">
              Verify your identity through the Nafath platform to unlock full access
              to rentals and transactions.
            </p>

            {verifySuccess && (
              <div className="mb-4 text-green-300 text-sm bg-green-950/40 border border-green-900 rounded-md p-3">
                {verifySuccess}
              </div>
            )}

            {verifyError && (
              <div className="mb-4 text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-md p-3">
                {verifyError}
              </div>
            )}

            {!showVerifyForm ? (
              <Button
                onClick={() => setShowVerifyForm(true)}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <Fingerprint className="w-4 h-4 mr-1.5" />
                Start Verification
              </Button>
            ) : (
              <form onSubmit={handleNafathVerify} className="space-y-4 max-w-sm">
                <div>
                  <Label className="text-neutral-300">National ID</Label>
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="10-digit National ID"
                    className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify with Nafath"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    onClick={() => {
                      setShowVerifyForm(false);
                      setNationalId("");
                      setVerifyError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
