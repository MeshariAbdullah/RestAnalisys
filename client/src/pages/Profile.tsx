import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  IdCard,
  Activity,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { authApi } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  renter: "Renter",
  owner: "Asset Owner",
  inspector: "Inspector",
  operations: "Operations",
  admin: "Admin",
  super_admin: "Super Admin",
};

const KYC_META: Record<string, { color: string; label: string }> = {
  unverified: { color: "bg-neutral-200 text-neutral-700", label: "Unverified" },
  pending: { color: "bg-amber-100 text-amber-800", label: "Pending" },
  verified: { color: "bg-green-100 text-green-700", label: "Verified" },
  rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
};

const RISK_META: Record<string, { color: string }> = {
  low: { color: "text-green-600" },
  medium: { color: "text-amber-600" },
  high: { color: "text-orange-600" },
  ultra_high: { color: "text-red-600" },
};

function maskNationalId(id: string): string {
  if (id.length <= 4) return id;
  return "*".repeat(id.length - 4) + id.slice(-4);
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [nationalId, setNationalId] = useState("");
  const [nafathError, setNafathError] = useState<string | null>(null);
  const [nafathSuccess, setNafathSuccess] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => authApi.me(),
  });

  const nafathMutation = useMutation({
    mutationFn: (nid: string) => authApi.nafathVerify(nid),
    onSuccess: (result) => {
      if (result.status === "verified") {
        setNafathSuccess(true);
        setNafathError(null);
        queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      } else {
        setNafathError(`Verification status: ${result.status}. Please try again.`);
      }
    },
    onError: (err: Error) => {
      setNafathError(err.message ?? "Verification failed");
    },
  });

  function handleNafathVerify() {
    if (!nationalId.trim()) {
      setNafathError("Please enter your National ID / Iqama number");
      return;
    }
    setNafathError(null);
    setNafathSuccess(false);
    nafathMutation.mutate(nationalId.trim());
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-neutral-500">Unable to load profile.</div>
    );
  }

  const trustColor =
    user.trustScore >= 70 ? "text-green-600" : user.trustScore >= 40 ? "text-amber-600" : "text-red-600";
  const kyc = KYC_META[user.kycStatus] ?? KYC_META.unverified;
  const risk = RISK_META[user.riskCategory] ?? RISK_META.medium;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-neutral-500 mb-8">
        Account details, verification status and trust score.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-neutral-950">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{user.fullName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className="bg-amber-500 text-neutral-950 border-0">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                    <Badge className={`${kyc.color} border-0`}>
                      KYC: {kyc.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-700">{user.email}</span>
                </div>
                {user.phoneE164 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-700">{user.phoneE164}</span>
                  </div>
                )}
                {user.nationalId && (
                  <div className="flex items-center gap-3 text-sm">
                    <IdCard className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-700 font-mono">
                      {maskNationalId(user.nationalId)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Nafath verification */}
          <Card className={user.nafathVerified ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {user.nafathVerified ? (
                  <BadgeCheck className="w-6 h-6 text-green-600" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <h3 className="font-semibold">
                    Nafath Digital Identity
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {user.nafathVerified
                      ? "Your identity is verified via Saudi Digital Identity (Nafath)"
                      : "Verify your identity to unlock rentals and legal commitments"}
                  </p>
                </div>
              </div>

              {user.nafathVerified ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-md p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Identity verified — you can rent assets and sign legal commitments.
                </div>
              ) : (
                <div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">National ID / Iqama</Label>
                      <Input
                        placeholder="e.g. 1012345678"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        maxLength={12}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleNafathVerify}
                        disabled={nafathMutation.isPending}
                        className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      >
                        {nafathMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        ) : (
                          <BadgeCheck className="w-4 h-4 mr-1.5" />
                        )}
                        Verify
                      </Button>
                    </div>
                  </div>
                  {nafathError && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {nafathError}
                    </div>
                  )}
                  {nafathSuccess && (
                    <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      Identity verified successfully!
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account security */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-neutral-500" />
                Account security
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <VerificationItem
                  icon={Phone}
                  label="Phone verified"
                  verified={!!user.phoneE164}
                />
                <VerificationItem
                  icon={Mail}
                  label="Email verified"
                  verified={true}
                />
                <VerificationItem
                  icon={BadgeCheck}
                  label="Nafath verified"
                  verified={user.nafathVerified}
                />
                <VerificationItem
                  icon={IdCard}
                  label="National ID on file"
                  verified={!!user.nationalId}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trust score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                <Activity className="w-4 h-4" />
                Trust score
              </div>
              <p className={`text-4xl font-bold ${trustColor}`}>
                {user.trustScore}
                <span className="text-base font-normal text-neutral-400"> / 100</span>
              </p>
              <Progress
                value={user.trustScore}
                className="mt-3 h-2"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Risk category</span>
                <span className={`text-sm font-semibold ${risk.color}`}>
                  {user.riskCategory.replace(/_/g, " ")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                <Clock className="w-4 h-4" />
                Account
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">User ID</span>
                  <span className="font-mono">#{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Role</span>
                  <span>{ROLE_LABELS[user.role] ?? user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span>
                    {user.isBlocked ? (
                      <Badge className="bg-red-100 text-red-700 border-0">Blocked</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function VerificationItem({
  icon: Icon,
  label,
  verified,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  verified: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border">
      <Icon className="w-4 h-4 text-neutral-400" />
      <span className="text-sm flex-1">{label}</span>
      {verified ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-neutral-300" />
      )}
    </div>
  );
}
