import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Shield, CheckCircle2, AlertTriangle, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function kycColor(s: string): string {
  if (s === "verified") return "bg-green-100 text-green-700";
  if (s === "pending") return "bg-amber-100 text-amber-800";
  if (s === "rejected") return "bg-red-100 text-red-700";
  return "bg-neutral-200 text-neutral-700";
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  };
  return labels[role] ?? role;
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const localUser = getCurrentUser();
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    initialData: localUser ?? undefined,
  });

  async function handleNafathVerify() {
    if (!nationalId.trim()) return;
    setVerifying(true);
    try {
      await authApi.nafathVerify(nationalId);
      const updated = await authApi.me();
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Nafath verification complete", description: "Your identity has been verified successfully.", variant: "success" });
    } catch (err) {
      toast({ title: "Verification failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Account details and verification status.</p>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-neutral-950" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <p className="text-neutral-500">{user.email}</p>
                <Badge className="mt-1 bg-neutral-900 text-white">{roleLabel(user.role)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Phone" value={user.phoneE164 ?? "Not set"} />
              <InfoRow label="National ID" value={user.nationalId ?? "Not set"} />
              <InfoRow label="Trust Score" value={`${user.trustScore} / 100`} />
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Risk Category</span>
                <Badge className={`border-0 ${riskColor(user.riskCategory)}`}>{user.riskCategory}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Verification Status
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border">
                <div className="flex items-center gap-3">
                  {user.nafathVerified ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Nafath Identity</p>
                    <p className="text-xs text-neutral-500">Saudi Digital Identity Verification</p>
                  </div>
                </div>
                {user.nafathVerified ? (
                  <Badge className="bg-green-100 text-green-700 border-0">Verified</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-0">Not verified</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border">
                <div className="flex items-center gap-3">
                  <BadgeCheck className={`w-5 h-5 ${user.kycStatus === "verified" ? "text-green-600" : "text-neutral-400"}`} />
                  <div>
                    <p className="font-medium">KYC Status</p>
                    <p className="text-xs text-neutral-500">Know Your Customer verification</p>
                  </div>
                </div>
                <Badge className={`border-0 ${kycColor(user.kycStatus)}`}>{user.kycStatus}</Badge>
              </div>
            </div>

            {!user.nafathVerified && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-neutral-600 mb-3">
                  Verify your identity with Nafath to unlock full platform features including renting luxury items.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">National ID</Label>
                    <Input
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. 1012345678"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleNafathVerify}
                    disabled={verifying || !nationalId.trim()}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400 self-end"
                  >
                    {verifying ? "Verifying..." : "Verify with Nafath"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Trust Score Breakdown</h3>
            <div className="space-y-3">
              <ScoreBar label="Overall Trust" value={user.trustScore} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-neutral-50 rounded-lg border">
                  <p className="text-neutral-500">Identity</p>
                  <p className="font-semibold">{user.nafathVerified ? "Verified" : "Pending"}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border">
                  <p className="text-neutral-500">Risk Level</p>
                  <p className="font-semibold capitalize">{user.riskCategory}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-green-500" :
    value >= 60 ? "bg-amber-500" :
    value >= 40 ? "bg-orange-500" :
    "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-600">{label}</span>
        <span className="font-mono font-medium">{value}/100</span>
      </div>
      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
