import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  BadgeCheck,
  Key,
  Phone,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [changingPw, setChangingPw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [verifyingNafath, setVerifyingNafath] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [nafathMsg, setNafathMsg] = useState<string | null>(null);
  const [nafathError, setNafathError] = useState<string | null>(null);

  function startEdit() {
    if (user) {
      setFullName(user.fullName);
      setPhoneE164(user.phoneE164 ?? "");
    }
    setEditing(true);
    setProfileMsg(null);
  }

  async function saveProfile() {
    setProfileMsg(null);
    try {
      await authApi.updateProfile({ fullName, phoneE164: phoneE164 || undefined });
      await qc.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
      setProfileMsg("Profile updated");
    } catch (err) {
      setProfileMsg((err as Error).message);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwMsg("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setChangingPw(false);
    } catch (err) {
      setPwError((err as Error).message);
    }
  }

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    setNafathMsg(null);
    setNafathError(null);
    try {
      const result = await authApi.nafathVerify(nationalId);
      if (result.status === "verified") {
        setNafathMsg("Identity verified successfully");
        await qc.invalidateQueries({ queryKey: ["me"] });
        setVerifyingNafath(false);
      } else {
        setNafathMsg(`Verification status: ${result.status}`);
      }
    } catch (err) {
      setNafathError((err as Error).message);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-neutral-500 mb-8">
        Manage your account settings and identity verification.
      </p>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-neutral-950" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{user.fullName}</p>
                  <p className="text-sm text-neutral-500">{user.email}</p>
                </div>
              </div>
              <Badge className="bg-neutral-900 text-white">
                {user.role.replace(/_/g, " ")}
              </Badge>
            </div>

            {editing ? (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone (E.164)</Label>
                  <Input
                    value={phoneE164}
                    onChange={(e) => setPhoneE164(e.target.value)}
                    placeholder="+966512345678"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveProfile}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm border-t pt-4">
                <Row icon={Mail} label="Email" value={user.email} />
                <Row
                  icon={Phone}
                  label="Phone"
                  value={user.phoneE164 ?? "Not set"}
                />
                <Row
                  icon={Shield}
                  label="Trust score"
                  value={`${user.trustScore} (${user.riskCategory})`}
                />
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    Edit profile
                  </Button>
                </div>
              </div>
            )}
            {profileMsg && (
              <p className="text-sm text-green-700 mt-2">{profileMsg}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BadgeCheck className="w-5 h-5 text-amber-500" />
              <p className="font-semibold">Identity verification (Nafath)</p>
            </div>
            {user.nafathVerified ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded p-3">
                <BadgeCheck className="w-4 h-4" />
                Identity verified via Nafath
              </div>
            ) : verifyingNafath ? (
              <form onSubmit={handleNafathVerify} className="space-y-3">
                <div>
                  <Label>National ID (10 digits)</Label>
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="1234567890"
                    pattern="[12]\d{9}"
                    className="mt-1"
                    required
                  />
                </div>
                {nafathError && (
                  <p className="text-sm text-red-700">{nafathError}</p>
                )}
                {nafathMsg && (
                  <p className="text-sm text-green-700">{nafathMsg}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    Verify
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVerifyingNafath(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm text-neutral-500 mb-3">
                  Verify your Saudi identity to unlock high-value rentals and
                  legal commitments.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setVerifyingNafath(true)}
                >
                  Start verification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-amber-500" />
              <p className="font-semibold">Password</p>
            </div>
            {changingPw ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <Label>Current password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>New password (min 8 characters)</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    className="mt-1"
                    required
                  />
                </div>
                {pwError && (
                  <p className="text-sm text-red-700">{pwError}</p>
                )}
                {pwMsg && (
                  <p className="text-sm text-green-700">{pwMsg}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    Change password
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setChangingPw(false);
                      setPwError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="outline" onClick={() => setChangingPw(true)}>
                Change password
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-neutral-400" />
      <span className="text-neutral-500 w-24">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
