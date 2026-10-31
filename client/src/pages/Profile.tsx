import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User } from "@/lib/api";
import { getScoreBg } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
        verified ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {verified ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span>{label}</span>
      <Badge
        className={`ml-auto ${
          verified
            ? "bg-green-100 text-green-700 border-0"
            : "bg-neutral-200 text-neutral-600 border-0"
        }`}
      >
        {verified ? "Verified" : "Unverified"}
      </Badge>
    </div>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [nafathId, setNafathId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  async function handleNafathVerify() {
    if (!nafathId.trim()) return;
    setVerifying(true);
    try {
      const result = await authApi.nafathVerify(nafathId);
      if (result.status === "verified") {
        toast({ title: "Identity verified successfully", variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      } else {
        toast({
          title: "Verification pending",
          description: `Transaction ID: ${result.transactionId}`,
        });
      }
    } catch (err) {
      toast({
        title: "Verification failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-96 rounded-xl bg-neutral-100 animate-pulse" />
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

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    ultra_high: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">
        Account details and verification status.
      </p>

      {/* Account info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-neutral-950" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.fullName}</h2>
              <p className="text-neutral-500">{user.email}</p>
              <Badge className="mt-1 capitalize bg-neutral-100 text-neutral-700 border-0">
                {user.role.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {user.phoneE164 && (
              <div>
                <span className="text-neutral-500">Phone</span>
                <p className="font-medium">{user.phoneE164}</p>
              </div>
            )}
            {user.nationalId && (
              <div>
                <span className="text-neutral-500">National ID</span>
                <p className="font-mono text-xs">{user.nationalId}</p>
              </div>
            )}
            <div>
              <span className="text-neutral-500">KYC Status</span>
              <p className="font-medium capitalize">{user.kycStatus}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust score */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Trust & Risk Profile
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-sm text-neutral-500">Trust Score</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold">{user.trustScore}</span>
                <span className="text-neutral-500">/ 100</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    user.trustScore >= 80
                      ? "bg-green-500"
                      : user.trustScore >= 60
                      ? "bg-amber-500"
                      : user.trustScore >= 40
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${user.trustScore}%` }}
                />
              </div>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Risk Category</span>
              <div className="mt-1">
                <Badge
                  className={`text-sm px-3 py-1 border-0 capitalize ${
                    riskColors[user.riskCategory] ?? riskColors.medium
                  }`}
                >
                  {user.riskCategory.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                {user.trustScore >= 70
                  ? "Eligible for 100% commitment on rentals."
                  : "Requires 150% commitment on rentals."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4" /> Verification Status
          </h3>
          <div className="space-y-3">
            <VerificationBadge verified={user.nafathVerified} label="Nafath Identity" />
            <VerificationBadge
              verified={user.kycStatus === "verified"}
              label="KYC Verification"
            />
            <VerificationBadge
              verified={!!(user as any).phoneVerified}
              label="Phone Number"
            />
            <VerificationBadge
              verified={!!(user as any).emailVerified}
              label="Email Address"
            />
          </div>
        </CardContent>
      </Card>

      {/* Nafath verification form */}
      {!user.nafathVerified && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Verify Your
              Identity
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Nafath verification is required to rent luxury items. Enter your
              National ID (Iqama) to begin verification.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs">National ID</Label>
                <Input
                  placeholder="10-digit ID starting with 1 or 2"
                  value={nafathId}
                  onChange={(e) => setNafathId(e.target.value)}
                  maxLength={10}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleNafathVerify}
                  disabled={verifying || nafathId.length !== 10}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {verifying ? "Verifying..." : "Verify via Nafath"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
