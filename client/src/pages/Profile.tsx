import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

function VerificationDot({ verified }: { verified: boolean }) {
  return verified ? (
    <CheckCircle className="w-4 h-4 text-green-500" />
  ) : (
    <XCircle className="w-4 h-4 text-neutral-400" />
  );
}

export default function Profile() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [nafathId, setNafathId] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  function startEditing() {
    if (!user) return;
    setFullName(user.fullName);
    setPhoneE164(user.phoneE164 ?? "");
    setEditing(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await authApi.updateProfile({
        fullName: fullName || undefined,
        phoneE164: phoneE164 || undefined,
      });
      const current = getCurrentUser();
      if (current) {
        saveSession(localStorage.getItem("auth_token")!, {
          ...current,
          fullName: updated.fullName,
          phoneE164: updated.phoneE164,
        });
      }
      await qc.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleNafathVerify() {
    if (!nafathId.trim()) return;
    setVerifying(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authApi.nafathVerify(nafathId);
      if (res.status === "verified") {
        setSuccess("Identity verified via Nafath");
        const current = getCurrentUser();
        if (current) {
          saveSession(localStorage.getItem("auth_token")!, {
            ...current,
            nafathVerified: true,
            kycStatus: "verified",
          });
        }
        await qc.invalidateQueries({ queryKey: ["me"] });
        setNafathId("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading profile…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-neutral-950" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.fullName}</h1>
          <p className="text-neutral-500">{user.email}</p>
        </div>
        <Badge className="ml-auto capitalize bg-neutral-900 text-white">
          {user.role.replace(/_/g, " ")}
        </Badge>
      </div>

      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Personal info
            </h2>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Full name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone (E.164)</Label>
                  <Input
                    value={phoneE164}
                    onChange={(e) => setPhoneE164(e.target.value)}
                    placeholder="+9665XXXXXXXX"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <Row label="Full name" value={user.fullName} />
                <Row label="Email" value={user.email} />
                <Row label="Phone" value={user.phoneE164 ?? "Not set"} />
                <Row label="National ID" value={user.nationalId ?? "Not linked"} />
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={startEditing}
                >
                  Edit profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Verification status
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Nafath ID</span>
                  <div className="flex items-center gap-2">
                    <VerificationDot verified={user.nafathVerified} />
                    <span>{user.nafathVerified ? "Verified" : "Unverified"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">KYC</span>
                  <Badge
                    className={
                      user.kycStatus === "verified"
                        ? "bg-green-100 text-green-700 border-0"
                        : "bg-amber-100 text-amber-800 border-0"
                    }
                  >
                    {user.kycStatus}
                  </Badge>
                </div>
              </div>

              {!user.nafathVerified && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded p-2 mb-3">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Verify your identity to unlock rentals and asset submissions.
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="National ID (10 digits)"
                      value={nafathId}
                      onChange={(e) => setNafathId(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={verifying || nafathId.length < 10}
                      onClick={handleNafathVerify}
                    >
                      {verifying ? "Verifying…" : "Verify"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Trust & risk</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Trust score</span>
                  <span className="font-bold text-lg">{user.trustScore}/100</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${user.trustScore}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Risk category</span>
                  <Badge
                    className={
                      user.riskCategory === "low"
                        ? "bg-green-100 text-green-700 border-0"
                        : user.riskCategory === "medium"
                        ? "bg-amber-100 text-amber-800 border-0"
                        : "bg-red-100 text-red-700 border-0"
                    }
                  >
                    {user.riskCategory}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
