import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  Phone,
  Mail,
  Key,
  CheckCircle,
  XCircle,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { profileApi, authApi } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [nafathId, setNafathId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [nafathMsg, setNafathMsg] = useState<string | null>(null);

  function startEdit() {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhoneE164(profile.phoneE164 ?? "");
    setEditing(true);
    setMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      await profileApi.update({ fullName, phoneE164: phoneE164 || undefined });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      setMsg("Profile updated");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwSaving(true);
    setPwMsg(null);
    try {
      await profileApi.changePassword(currentPw, newPw);
      setPwMsg("Password changed");
      setCurrentPw("");
      setNewPw("");
      setChangingPw(false);
    } catch (err) {
      setPwMsg((err as Error).message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleNafath() {
    setVerifying(true);
    setNafathMsg(null);
    try {
      const res = await authApi.nafathVerify(nafathId);
      if (res.status === "verified") {
        setNafathMsg("Identity verified successfully!");
        await qc.invalidateQueries({ queryKey: ["profile"] });
      } else {
        setNafathMsg(`Status: ${res.status}`);
      }
    } catch (err) {
      setNafathMsg((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!profile) return <div className="p-8">Unable to load profile.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account and verification.</p>

      {/* Profile info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Account info
            </h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Phone (E.164)</Label>
                <Input
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  placeholder="+966XXXXXXXXX"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
              {msg && <p className="text-sm text-green-700">{msg}</p>}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <InfoRow label="Name" value={profile.fullName} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phoneE164 ?? "Not set"} />
              <InfoRow label="Role" value={profile.role.replace(/_/g, " ")} />
              <InfoRow
                label="Member since"
                value={new Date(profile.createdAt).toLocaleDateString()}
              />
              {profile.lastLoginAt && (
                <InfoRow
                  label="Last login"
                  value={new Date(profile.lastLoginAt).toLocaleDateString()}
                />
              )}
              {msg && <p className="text-sm text-green-700 mt-2">{msg}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Verification
          </h2>
          <div className="space-y-3">
            <VerifyRow
              icon={BadgeCheck}
              label="Nafath (National ID)"
              verified={profile.nafathVerified}
            />
            <VerifyRow icon={Phone} label="Phone" verified={profile.phoneVerified ?? false} />
            <VerifyRow icon={Mail} label="Email" verified={profile.emailVerified ?? false} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">KYC status</span>
              <Badge
                className={
                  profile.kycStatus === "verified"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {profile.kycStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Trust score</span>
              <span className="font-bold">{profile.trustScore}/100</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Risk category</span>
              <Badge variant="outline">{profile.riskCategory}</Badge>
            </div>
          </div>

          {/* Nafath verification */}
          {!profile.nafathVerified && (
            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-medium mb-2">Verify via Nafath</p>
              <div className="flex gap-2">
                <Input
                  placeholder="National ID / Iqama"
                  value={nafathId}
                  onChange={(e) => setNafathId(e.target.value)}
                />
                <Button
                  onClick={handleNafath}
                  disabled={verifying || !nafathId}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400 shrink-0"
                >
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
              {nafathMsg && (
                <p className="text-sm mt-2 text-green-700">{nafathMsg}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            Security
          </h2>
          {changingPw ? (
            <div className="space-y-4">
              <div>
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </div>
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !currentPw || !newPw}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {pwSaving ? "Changing..." : "Change password"}
                </Button>
                <Button variant="outline" onClick={() => setChangingPw(false)}>
                  Cancel
                </Button>
              </div>
              {pwMsg && <p className="text-sm text-amber-700">{pwMsg}</p>}
            </div>
          ) : (
            <div>
              <p className="text-sm text-neutral-500 mb-3">
                Change your password to keep your account secure.
              </p>
              <Button variant="outline" onClick={() => setChangingPw(true)}>
                Change password
              </Button>
              {pwMsg && <p className="text-sm text-green-700 mt-2">{pwMsg}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function VerifyRow({
  icon: Icon,
  label,
  verified,
}: {
  icon: typeof Shield;
  label: string;
  verified: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-neutral-500">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      {verified ? (
        <span className="flex items-center gap-1 text-green-700 font-medium">
          <CheckCircle className="w-4 h-4" /> Verified
        </span>
      ) : (
        <span className="flex items-center gap-1 text-neutral-400">
          <XCircle className="w-4 h-4" /> Not verified
        </span>
      )}
    </div>
  );
}
