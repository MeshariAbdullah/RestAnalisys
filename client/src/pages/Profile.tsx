import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  BadgeCheck,
  AlertTriangle,
  Phone,
  Mail,
  CreditCard,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User as UserType } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

function riskColor(cat: string) {
  if (cat === "low") return "bg-green-100 text-green-700";
  if (cat === "medium") return "bg-amber-100 text-amber-800";
  if (cat === "high") return "bg-red-100 text-red-700";
  return "bg-red-600 text-white";
}

function kycColor(status: string) {
  if (status === "verified") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-600";
}

export default function Profile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const localUser = getCurrentUser();
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    initialData: localUser ?? undefined,
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleNafathVerify() {
    if (!nationalId.trim()) return;
    setVerifying(true);
    try {
      await authApi.nafathVerify(nationalId);
      const updated = await authApi.me();
      saveSession(localStorage.getItem("auth_token")!, updated);
      qc.setQueryData(["me"], updated);
      toast({ title: "Nafath verification initiated", description: "Identity verification in progress.", variant: "success" });
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">
        Your account details, verification status, and trust score.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Identity card */}
        <Card className="md:col-span-2">
          <CardContent className="p-8">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-neutral-950" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold">{user.fullName}</h2>
                <Badge className="mt-1 bg-amber-100 text-amber-800 border-0">
                  {roleLabel[user.role] ?? user.role}
                </Badge>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                  {user.phoneE164 && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Phone className="w-4 h-4" />
                      {user.phoneE164}
                    </div>
                  )}
                  {user.nationalId && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <CreditCard className="w-4 h-4" />
                      {user.nationalId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust score */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-8 text-center">
            <Activity className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-neutral-500 mb-1">Trust Score</p>
            <p className="text-5xl font-bold mb-2">{user.trustScore}</p>
            <Progress value={user.trustScore} className="h-2 mb-3" />
            <Badge className={`border-0 ${riskColor(user.riskCategory)}`}>
              {user.riskCategory.replace("_", " ")} risk
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Verification status */}
      <h2 className="text-lg font-semibold mb-3">Verification Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <BadgeCheck className={`w-6 h-6 ${user.nafathVerified ? "text-green-500" : "text-neutral-300"}`} />
              <div>
                <p className="font-medium text-sm">Nafath Identity</p>
                <Badge className={`border-0 text-xs ${user.nafathVerified ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"}`}>
                  {user.nafathVerified ? "Verified" : "Not verified"}
                </Badge>
              </div>
            </div>
            {!user.nafathVerified && (
              <div className="space-y-2">
                <Label className="text-xs">National / Iqama ID</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="10-digit ID"
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  onClick={handleNafathVerify}
                  disabled={verifying || !nationalId.trim()}
                >
                  {verifying ? "Verifying..." : "Verify via Nafath"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${user.kycStatus === "verified" ? "text-green-500" : "text-neutral-300"}`} />
              <div>
                <p className="font-medium text-sm">KYC Status</p>
                <Badge className={`border-0 text-xs ${kycColor(user.kycStatus)}`}>
                  {user.kycStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              {user.isBlocked ? (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              ) : (
                <BadgeCheck className="w-6 h-6 text-green-500" />
              )}
              <div>
                <p className="font-medium text-sm">Account Status</p>
                <Badge className={`border-0 text-xs ${user.isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {user.isBlocked ? "Blocked" : "Active"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk explanation */}
      <h2 className="text-lg font-semibold mb-3">Trust Score Explained</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-neutral-600 mb-4">
            Your trust score is computed by the platform's risk engine based on your account history,
            verification status, and rental behavior. A higher score unlocks lower commitment
            percentages (100% instead of 150% of asset value).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Identity</p>
              <p className={`font-bold ${user.nafathVerified ? "text-green-600" : "text-red-500"}`}>
                {user.nafathVerified ? "+15 pts" : "0 pts"}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">KYC</p>
              <p className={`font-bold ${user.kycStatus === "verified" ? "text-green-600" : "text-red-500"}`}>
                {user.kycStatus === "verified" ? "+10 pts" : "0 pts"}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Score</p>
              <p className="font-bold">{user.trustScore}/100</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Commitment</p>
              <p className="font-bold text-amber-600">
                {user.trustScore >= 70 ? "100%" : "150%"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
