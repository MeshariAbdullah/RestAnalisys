import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  BadgeCheck,
  AlertTriangle,
  Mail,
  Phone,
  Fingerprint,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function kycBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-700 border-0">Verified</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 border-0">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 border-0">Rejected</Badge>;
    default:
      return <Badge variant="outline">Unverified</Badge>;
  }
}

function riskBadge(category: string) {
  switch (category) {
    case "low":
      return <Badge className="bg-green-100 text-green-700 border-0">Low</Badge>;
    case "medium":
      return <Badge className="bg-amber-100 text-amber-700 border-0">Medium</Badge>;
    case "high":
      return <Badge className="bg-red-100 text-red-700 border-0">High</Badge>;
    case "ultra_high":
      return <Badge className="bg-red-600 text-white border-0">Ultra High</Badge>;
    default:
      return <Badge variant="outline">{category}</Badge>;
  }
}

function roleLabel(role: string): string {
  return {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  }[role] ?? role;
}

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleNafathVerify() {
    if (!nationalId.trim()) return;
    setVerifying(true);
    try {
      const res = await authApi.nafathVerify(nationalId);
      toast({
        title: "Nafath verification initiated",
        description: `Transaction ${res.transactionId} — status: ${res.status}`,
        variant: "success",
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
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
        <p className="text-neutral-500">Loading profile…</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-neutral-600">Failed to load profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">
        Account details and verification status.
      </p>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="w-8 h-8 text-neutral-950" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <Badge className="mt-1 bg-neutral-100 text-neutral-700 border-0">
                  {roleLabel(user.role)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Phone</p>
                  <p className="font-medium">
                    {user.phoneE164 ?? "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust & Risk */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Trust & Risk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Trust Score</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-bold">{user.trustScore}</p>
                  <div className="flex-1">
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(user.trustScore, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Risk Category</p>
                <div className="mt-1">{riskBadge(user.riskCategory)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Identity Verification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-neutral-500 mb-1">
                  Nafath Identity
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {user.nafathVerified ? (
                    <>
                      <BadgeCheck className="w-5 h-5 text-green-500" />
                      <Badge className="bg-green-100 text-green-700 border-0">
                        Verified
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        Not Verified
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">KYC Status</p>
                <div className="mt-1">{kycBadge(user.kycStatus)}</div>
              </div>
            </div>

            {!user.nafathVerified && (
              <div className="border-t pt-5">
                <p className="text-sm text-neutral-600 mb-3">
                  Verify your identity via Nafath to unlock full platform
                  features including signing contracts and renting high-value
                  items.
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Saudi National ID</Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input
                        placeholder="1XXXXXXXXX"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        className="pl-9"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleNafathVerify}
                    disabled={verifying || nationalId.length !== 10}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {verifying ? "Verifying…" : "Verify with Nafath"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
