import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { authApi } from "@/lib/api";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  ultra_high: "bg-red-200 text-red-900",
};

const ROLE_LABELS: Record<string, string> = {
  renter: "Renter",
  owner: "Asset Owner",
  inspector: "Inspector",
  operations: "Operations",
  admin: "Admin",
  super_admin: "Super Admin",
};

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {verified ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-neutral-400" />
      )}
      <span className={verified ? "text-green-700 font-medium" : "text-neutral-500"}>
        {label}
      </span>
    </div>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [nationalId, setNationalId] = useState("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const nafathMutation = useMutation({
    mutationFn: (nid: string) => authApi.nafathVerify(nid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center text-neutral-500">
        Unable to load profile.
      </div>
    );
  }

  const trustColor =
    user.trustScore >= 80
      ? "text-green-600"
      : user.trustScore >= 60
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-neutral-500 mb-8">Your account details and verification status.</p>

      {/* User Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-neutral-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">{user.fullName}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
              {user.phoneE164 && (
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
                  <Phone className="w-3.5 h-3.5" />
                  {user.phoneE164}
                </div>
              )}
              {user.nationalId && (
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
                  <CreditCard className="w-3.5 h-3.5" />
                  {user.nationalId}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-neutral-900 text-white hover:bg-neutral-900">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              {user.isBlocked && (
                <Badge className="bg-red-600 text-white hover:bg-red-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Blocked
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Verification Status
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <VerificationBadge verified={user.nafathVerified} label="Nafath Identity" />
            <VerificationBadge
              verified={user.kycStatus === "verified"}
              label={`KYC: ${user.kycStatus}`}
            />
            <VerificationBadge
              verified={user.phoneVerified}
              label="Phone"
            />
            <VerificationBadge
              verified={user.emailVerified}
              label="Email"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trust Score */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Trust Score</h3>
          <div className="flex items-center gap-4 mb-3">
            <span className={`text-3xl font-bold ${trustColor}`}>{user.trustScore}</span>
            <span className="text-neutral-400 text-sm">/ 100</span>
            <Badge
              className={`${RISK_COLORS[user.riskCategory] ?? "bg-neutral-100 text-neutral-700"} border-0 ml-auto`}
            >
              {user.riskCategory.replace(/_/g, " ")} risk
            </Badge>
          </div>
          <Progress value={user.trustScore} className="h-2" />
          <p className="text-xs text-neutral-500 mt-2">
            Your trust score is calculated from your rental history, verification status, and account age.
          </p>
        </CardContent>
      </Card>

      {/* Nafath Verification Form */}
      {!user.nafathVerified && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Verify Your Identity</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Nafath verification is required to rent luxury items. Enter your national ID or Iqama number to begin.
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="nationalId" className="text-sm mb-1.5 block">
                  National ID / Iqama
                </Label>
                <Input
                  id="nationalId"
                  placeholder="10-digit ID number"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  maxLength={10}
                />
              </div>
              <Button
                onClick={() => nafathMutation.mutate(nationalId)}
                disabled={nationalId.length < 10 || nafathMutation.isPending}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {nafathMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Verify
              </Button>
            </div>
            {nafathMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-3 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Verification successful. Your identity has been confirmed.
              </p>
            )}
            {nafathMutation.isError && (
              <p className="text-sm text-red-600 mt-3 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                {(nafathMutation.error as Error).message || "Verification failed. Please try again."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
