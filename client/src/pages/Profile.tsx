import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  BadgeCheck,
  AlertTriangle,
  LogOut,
  Fingerprint,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

function riskColor(cat: string): string {
  if (cat === "low") return "bg-green-100 text-green-700";
  if (cat === "medium") return "bg-amber-100 text-amber-800";
  if (cat === "high") return "bg-red-100 text-red-700";
  return "bg-red-200 text-red-900";
}

function kycLabel(status: string): string {
  return { unverified: "Unverified", pending: "Pending", verified: "Verified", rejected: "Rejected" }[status] ?? status;
}

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(false);
    try {
      const res = await authApi.nafathVerify(nationalId);
      if (res.status === "verified") {
        setVerifySuccess(true);
        await qc.invalidateQueries({ queryKey: ["me"] });
        toast({ title: "Identity verified", description: "Your Nafath verification is complete.", variant: "success" });
      } else {
        setVerifyError(`Verification status: ${res.status}. Please try again.`);
      }
    } catch (err) {
      const msg = (err as Error).message ?? "Verification failed";
      setVerifyError(msg);
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

  if (isLoading || !user) {
    return <div className="p-8">Loading profile…</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My profile</h1>
          <p className="text-neutral-500 mt-1">
            Account details and identity verification
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>

      {/* Basic info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-neutral-950" />
            </div>
            <div>
              <p className="text-xl font-bold">{user.fullName}</p>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
            <Badge className="ml-auto capitalize">{user.role.replace(/_/g, " ")}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Phone</p>
              <p className="font-medium">{user.phoneE164 ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-neutral-500">National ID</p>
              <p className="font-medium">{user.nationalId ?? "Not linked"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identity & trust */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Identity & trust</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusTile
              icon={user.nafathVerified ? ShieldCheck : ShieldAlert}
              label="Nafath ID"
              value={user.nafathVerified ? "Verified" : "Not verified"}
              ok={user.nafathVerified}
            />
            <StatusTile
              icon={BadgeCheck}
              label="KYC"
              value={kycLabel(user.kycStatus)}
              ok={user.kycStatus === "verified"}
            />
            <StatusTile
              icon={Phone}
              label="Phone"
              value={user.phoneVerified ? "Verified" : "Unverified"}
              ok={!!user.phoneVerified}
            />
            <StatusTile
              icon={Mail}
              label="Email"
              value={user.emailVerified ? "Verified" : "Unverified"}
              ok={!!user.emailVerified}
            />
          </div>

          <div className="mt-6 flex items-center gap-6 p-4 bg-neutral-50 rounded-lg border">
            <div>
              <p className="text-sm text-neutral-500">Trust score</p>
              <p className="text-3xl font-bold">{user.trustScore}</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${user.trustScore}%` }}
                />
              </div>
            </div>
            <Badge className={`shrink-0 border-0 ${riskColor(user.riskCategory)}`}>
              {user.riskCategory.replace(/_/g, " ")} risk
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Nafath verification */}
      {!user.nafathVerified && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Fingerprint className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold">Verify your identity with Nafath</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Nafath verification is required before you can rent luxury items or sign legal commitments.
                  Enter your Saudi National ID (Iqama) to begin.
                </p>
              </div>
            </div>

            {verifySuccess ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                <ShieldCheck className="w-4 h-4" />
                Identity verified successfully. Your account is now Nafath-verified.
              </div>
            ) : (
              <form onSubmit={handleNafathVerify} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-sm text-neutral-600">National ID</Label>
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="10-digit ID starting with 1 or 2"
                    pattern="^[12]\d{9}$"
                    required
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={verifying}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {verifying ? "Verifying…" : "Verify via Nafath"}
                </Button>
              </form>
            )}

            {verifyError && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {verifyError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {user.isBlocked && (
        <Card className="mt-6 border-red-300 bg-red-50">
          <CardContent className="p-6 flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Account blocked</p>
              <p className="text-sm">Please contact MLR support for assistance.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="text-center p-3 rounded-lg border bg-white">
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${ok ? "text-green-600" : "text-neutral-400"}`} />
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-sm font-medium ${ok ? "text-green-700" : "text-neutral-600"}`}>{value}</p>
    </div>
  );
}
