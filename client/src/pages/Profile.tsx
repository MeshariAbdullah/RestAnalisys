import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User as UserIcon,
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
import { authApi, type User } from "@/lib/api";

function trustBadge(score: number) {
  if (score >= 80) return { label: "Excellent", color: "bg-green-100 text-green-800" };
  if (score >= 60) return { label: "Good", color: "bg-blue-100 text-blue-800" };
  if (score >= 40) return { label: "Fair", color: "bg-amber-100 text-amber-800" };
  return { label: "Low", color: "bg-red-100 text-red-800" };
}

function kycBadge(status: string) {
  const map: Record<string, { color: string }> = {
    verified: { color: "bg-green-100 text-green-800" },
    pending: { color: "bg-amber-100 text-amber-800" },
    rejected: { color: "bg-red-100 text-red-800" },
    unverified: { color: "bg-neutral-100 text-neutral-600" },
  };
  return map[status] ?? map.unverified;
}

export default function Profile() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  async function handleNafathVerify() {
    if (!nationalId.match(/^[12]\d{9}$/)) {
      setVerifyResult("Invalid ID: must be 10 digits starting with 1 or 2");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await authApi.nafathVerify(nationalId);
      setVerifyResult(
        res.status === "verified"
          ? "Identity verified successfully! Please refresh."
          : `Status: ${res.status}`
      );
    } catch (err) {
      setVerifyResult((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading…</div>;

  const trust = trustBadge(user.trustScore);
  const kyc = kycBadge(user.kycStatus);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-neutral-950" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.fullName}</h1>
          <p className="text-neutral-500 capitalize">{user.role.replace(/_/g, " ")}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Account Details</h2>
            <div className="grid gap-3 text-sm">
              <Row icon={Mail} label="Email" value={user.email} />
              <Row icon={Phone} label="Phone" value={user.phoneE164 ?? "Not set"} />
              <Row icon={UserIcon} label="National ID" value={user.nationalId ?? "Not linked"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Verification Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatusCard
                icon={BadgeCheck}
                label="Nafath Identity"
                verified={user.nafathVerified}
              />
              <StatusCard
                icon={Shield}
                label="KYC"
                verified={user.kycStatus === "verified"}
                extra={
                  <Badge className={`mt-1 ${kyc.color}`}>
                    {user.kycStatus}
                  </Badge>
                }
              />
            </div>

            {!user.nafathVerified && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <p className="font-medium text-amber-900">Verify your identity</p>
                </div>
                <p className="text-sm text-amber-800 mb-3">
                  Nafath verification is required to rent luxury items.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="National ID (10 digits)"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button
                    onClick={handleNafathVerify}
                    disabled={verifying}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {verifying ? "Verifying…" : "Verify"}
                  </Button>
                </div>
                {verifyResult && (
                  <p className="text-sm mt-2 text-amber-800">{verifyResult}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Trust Score</h2>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{user.trustScore}</div>
              <div>
                <Badge className={trust.color}>{trust.label}</Badge>
                <p className="text-xs text-neutral-500 mt-1 capitalize">
                  Risk category: {user.riskCategory.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${user.trustScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
      <span className="text-neutral-500 w-28">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  verified,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  verified: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg p-4 ${verified ? "bg-green-50 border border-green-200" : "bg-neutral-50 border border-neutral-200"}`}>
      <Icon className={`w-6 h-6 mb-2 ${verified ? "text-green-600" : "text-neutral-400"}`} />
      <p className="text-sm font-medium">{label}</p>
      <p className={`text-xs ${verified ? "text-green-700" : "text-neutral-500"}`}>
        {verified ? "Verified" : "Not verified"}
      </p>
      {extra}
    </div>
  );
}
