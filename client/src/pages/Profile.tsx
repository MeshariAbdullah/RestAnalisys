import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  BadgeCheck,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { authApi, type User as UserType } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

function trustBadge(score: number) {
  if (score >= 80) return { label: "Trusted", color: "bg-green-100 text-green-800" };
  if (score >= 60) return { label: "Good", color: "bg-blue-100 text-blue-800" };
  if (score >= 40) return { label: "Moderate", color: "bg-yellow-100 text-yellow-800" };
  return { label: "New", color: "bg-neutral-100 text-neutral-800" };
}

export default function Profile() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const cachedUser = getCurrentUser();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    initialData: cachedUser ?? undefined,
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleNafathVerify() {
    if (!nationalId.trim()) {
      toast.warning("Please enter your National ID or Iqama number");
      return;
    }
    setVerifying(true);
    try {
      const res = await authApi.nafathVerify(nationalId);
      if (res.status === "verified") {
        toast.success("Nafath verification successful!");
        queryClient.invalidateQueries({ queryKey: ["me"] });
        const updatedUser = await authApi.me();
        saveSession(localStorage.getItem("auth_token")!, updatedUser);
      } else {
        toast.info(`Verification status: ${res.status}`);
      }
    } catch (err) {
      toast.error((err as Error).message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-8">Not authenticated.</div>;
  }

  const trust = trustBadge(user.trustScore);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Account details and verification status</p>

      <div className="grid gap-6">
        {/* Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-neutral-950" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{user.fullName}</h2>
                <p className="text-sm text-neutral-500 capitalize">{user.role.replace("_", " ")}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className={trust.color}>{trust.label} ({user.trustScore})</Badge>
                  <Badge variant="outline" className="capitalize">{user.riskCategory} risk</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 mt-6 text-sm">
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

        {/* Verification Status */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Verification Status
            </h3>
            <div className="space-y-3">
              <VerificationRow
                label="Nafath Identity"
                verified={user.nafathVerified}
                icon={BadgeCheck}
              />
              <VerificationRow
                label="KYC Status"
                verified={user.kycStatus === "verified"}
                status={user.kycStatus}
                icon={Shield}
              />
            </div>

            {!user.nafathVerified && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Verify your identity to unlock all features
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="National ID / Iqama"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    onClick={handleNafathVerify}
                    disabled={verifying}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {verifying ? "Verifying..." : "Verify via Nafath"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Security</h3>
            <div className="space-y-2 text-sm text-neutral-600">
              <p>Password: ********</p>
              <p className="text-xs text-neutral-400">
                Contact support to change your password or email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VerificationRow({
  label,
  verified,
  status,
  icon: Icon,
}: {
  label: string;
  verified: boolean;
  status?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-neutral-400" />
        <span>{label}</span>
      </div>
      {verified ? (
        <Badge className="bg-green-100 text-green-800">Verified</Badge>
      ) : (
        <Badge variant="outline" className="text-neutral-500">
          {status ?? "Not verified"}
        </Badge>
      )}
    </div>
  );
}
