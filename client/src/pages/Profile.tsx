import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  BadgeCheck,
  AlertCircle,
  User as UserIcon,
  Mail,
  Phone,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

const KYC_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  unverified: "bg-neutral-200 text-neutral-600",
  rejected: "bg-red-100 text-red-700",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  ultra_high: "bg-red-200 text-red-800",
};

function roleLabel(role: string): string {
  return (
    {
      renter: "Renter",
      owner: "Asset Owner",
      inspector: "Inspector",
      operations: "Operations",
      admin: "Admin",
      super_admin: "Super Admin",
    }[role] ?? role
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => authApi.me(),
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  async function handleNafathVerify() {
    if (!/^[12]\d{9}$/.test(nationalId)) {
      setVerifyError("National ID must be 10 digits starting with 1 or 2");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await authApi.nafathVerify(nationalId);
      if (res.status === "verified") {
        setVerifySuccess(true);
        const cached = getCurrentUser();
        if (cached) {
          const token = localStorage.getItem("auth_token") ?? "";
          saveSession(token, { ...cached, nafathVerified: true, kycStatus: "verified" });
        }
        queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      }
    } catch (err) {
      setVerifyError((err as Error).message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-48 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-neutral-500">
        Unable to load profile.
      </div>
    );
  }

  const showNafath = ["renter", "owner"].includes(user.role);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-neutral-500 mb-8">
        Your account details and verification status.
      </p>

      {/* Identity card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-7 h-7 text-neutral-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <Badge className="mt-1 bg-neutral-100 text-neutral-700 hover:bg-neutral-100">
                {roleLabel(user.role)}
              </Badge>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={user.phoneE164 ?? "Not set"}
                />
                <InfoRow
                  icon={CreditCard}
                  label="National ID"
                  value={
                    user.nationalId
                      ? `${user.nationalId.slice(0, 3)}****${user.nationalId.slice(-3)}`
                      : "Not linked"
                  }
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Trust score"
                  value={`${user.trustScore} / 100`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 mb-2">KYC Status</p>
            <Badge
              className={`${KYC_COLORS[user.kycStatus] ?? KYC_COLORS.unverified} border-0`}
            >
              {user.kycStatus.replace(/_/g, " ")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 mb-2">Risk Category</p>
            <Badge
              className={`${RISK_COLORS[user.riskCategory] ?? RISK_COLORS.medium} border-0`}
            >
              {user.riskCategory.replace(/_/g, " ")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-neutral-500 mb-2">Nafath Identity</p>
            {user.nafathVerified ? (
              <div className="flex items-center gap-1.5 text-green-700">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-medium">Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-sm font-medium">Not verified</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nafath verification section */}
      {showNafath && !user.nafathVerified && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <BadgeCheck className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Verify your identity with Nafath</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Nafath identity verification is required before you can create
                  rentals or submit assets. Enter your Saudi National ID or Iqama
                  number to begin.
                </p>
              </div>
            </div>

            {verifySuccess ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                <ShieldCheck className="w-4 h-4" />
                Identity verified successfully.
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs">National ID / Iqama</Label>
                  <Input
                    type="text"
                    placeholder="1234567890"
                    maxLength={10}
                    value={nationalId}
                    onChange={(e) =>
                      setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                  />
                </div>
                <Button
                  onClick={handleNafathVerify}
                  disabled={verifying || nationalId.length !== 10}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            )}

            {verifyError && (
              <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {verifyError}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
      <div>
        <p className="text-[11px] text-neutral-500">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
