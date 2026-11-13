import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  BadgeCheck,
  User as UserIcon,
  Save,
  Fingerprint,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, type User } from "@/lib/api";
import { saveSession } from "@/lib/auth";

function trustColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function riskBadgeVariant(cat: string): string {
  if (cat === "low") return "bg-green-100 text-green-700";
  if (cat === "medium") return "bg-amber-100 text-amber-800";
  if (cat === "high") return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [nafathId, setNafathId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  function startEdit(u: User) {
    setFullName(u.fullName);
    setPhoneE164(u.phoneE164 ?? "");
    setEditing(true);
    setSaveMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await authApi.updateProfile({
        fullName: fullName || undefined,
        phoneE164: phoneE164 || undefined,
      });
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
      setSaveMsg("Profile updated successfully.");
    } catch (err) {
      setSaveMsg((err as Error).message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNafathVerify() {
    if (!nafathId.trim()) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await authApi.nafathVerify(nafathId.trim());
      if (res.status === "verified") {
        setVerifyMsg("Nafath verification successful!");
        queryClient.invalidateQueries({ queryKey: ["me"] });
        const refreshed = await authApi.me();
        const token = localStorage.getItem("auth_token");
        if (token) saveSession(token, refreshed);
      } else {
        setVerifyMsg(`Verification status: ${res.status}`);
      }
    } catch (err) {
      setVerifyMsg((err as Error).message ?? "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading profile…</div>;
  }
  if (!user) {
    return <div className="p-8">Unable to load profile.</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Your account details and verification status.</p>

      {/* Identity card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-7 h-7 text-neutral-950" />
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Full name</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone (Saudi: +9665XXXXXXXX)</Label>
                    <Input
                      value={phoneE164}
                      onChange={(e) => setPhoneE164(e.target.value)}
                      placeholder="+966512345678"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{user.fullName}</h2>
                  <p className="text-sm text-neutral-500">{user.email}</p>
                  {user.phoneE164 && (
                    <p className="text-sm text-neutral-500">{user.phoneE164}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-neutral-900 text-white capitalize">
                      {user.role.replace(/_/g, " ")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(user)}
                      className="text-xs"
                    >
                      Edit profile
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {saveMsg && (
            <p className={`text-sm mb-4 ${saveMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {saveMsg}
            </p>
          )}

          {user.nationalId && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
              <Fingerprint className="w-4 h-4 text-neutral-400" />
              National ID: {user.nationalId}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust score */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-neutral-500 mb-3">Trust Score</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl font-bold">{user.trustScore}</span>
                <Badge className={`border-0 ${riskBadgeVariant(user.riskCategory)}`}>
                  {user.riskCategory} risk
                </Badge>
              </div>
              <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${trustColor(user.trustScore)}`}
                  style={{ width: `${user.trustScore}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                {user.trustScore >= 80
                  ? "Excellent standing — 100% commitment on rentals."
                  : user.trustScore >= 50
                  ? "Good standing — standard terms apply."
                  : "Additional verification may be required for high-value items."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification statuses */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-neutral-500 mb-4">Verification Status</h3>
          <div className="space-y-3">
            <VerificationRow
              icon={ShieldCheck}
              label="Nafath Identity"
              verified={user.nafathVerified}
            />
            <VerificationRow
              icon={BadgeCheck}
              label="KYC"
              verified={user.kycStatus === "verified"}
              status={user.kycStatus}
            />
            <VerificationRow
              icon={Phone}
              label="Phone"
              verified={!!user.phoneE164}
            />
            <VerificationRow
              icon={Mail}
              label="Email"
              verified={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Nafath verification */}
      {!user.nafathVerified && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold">Verify your identity with Nafath</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Nafath verification is required to rent or submit high-value assets.
              Enter your Saudi National ID to begin.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="National ID (10 digits)"
                value={nafathId}
                onChange={(e) => setNafathId(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={handleNafathVerify}
                disabled={verifying || !nafathId.trim()}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {verifying ? "Verifying…" : "Verify"}
              </Button>
            </div>
            {verifyMsg && (
              <p className={`text-sm mt-3 ${verifyMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {verifyMsg}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VerificationRow({
  icon: Icon,
  label,
  verified,
  status,
}: {
  icon: typeof ShieldCheck;
  label: string;
  verified: boolean;
  status?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${verified ? "text-green-500" : "text-neutral-400"}`} />
        <span className="text-sm">{label}</span>
      </div>
      {verified ? (
        <Badge className="bg-green-100 text-green-700 border-0">Verified</Badge>
      ) : (
        <Badge className="bg-neutral-100 text-neutral-500 border-0">
          {status ?? "Not verified"}
        </Badge>
      )}
    </div>
  );
}
