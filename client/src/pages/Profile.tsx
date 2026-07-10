import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  Phone,
  Mail,
  BadgeCheck,
  Lock,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [nafathId, setNafathId] = useState("");
  const [nafathLoading, setNafathLoading] = useState(false);
  const [nafathMsg, setNafathMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await authApi.updateProfile({
        fullName: fullName || undefined,
        phoneE164: phone || undefined,
      });
      const current = getCurrentUser();
      if (current) {
        saveSession(localStorage.getItem("auth_token")!, {
          ...current,
          fullName: updated.fullName,
        });
      }
      await qc.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg("Profile updated successfully");
    } catch (err) {
      setProfileMsg((err as Error).message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwMsg("Password changed successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    setNafathLoading(true);
    setNafathMsg(null);
    try {
      const res = await authApi.nafathVerify(nafathId);
      setNafathMsg(
        res.status === "verified"
          ? "Identity verified successfully!"
          : `Verification status: ${res.status}`
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setNafathMsg((err as Error).message);
    } finally {
      setNafathLoading(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!user) return <div className="p-8">Unable to load profile.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account details and security.</p>

      <div className="space-y-6">
        {/* Account info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-neutral-950" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user.fullName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{user.role.replace(/_/g, " ")}</Badge>
                  <Badge
                    className={
                      user.nafathVerified
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-600"
                    }
                  >
                    {user.nafathVerified ? "Nafath Verified" : "Unverified"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-neutral-600">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Phone className="w-4 h-4" />
                {user.phoneE164 ?? "Not set"}
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Shield className="w-4 h-4" />
                Trust score: {user.trustScore}/100
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <BadgeCheck className="w-4 h-4" />
                KYC: {user.kycStatus}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Edit Profile</h2>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone (E.164)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966500000000"
                  className="mt-1"
                />
              </div>
              {profileMsg && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {profileMsg}
                </div>
              )}
              <Button
                type="submit"
                disabled={profileSaving}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <Save className="w-4 h-4 mr-1" />
                {profileSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              {pwError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  {pwError}
                </div>
              )}
              {pwMsg && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {pwMsg}
                </div>
              )}
              <Button type="submit" disabled={pwSaving} variant="outline">
                {pwSaving ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Nafath verification */}
        {!user.nafathVerified && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-amber-600" />
                Verify Identity with Nafath
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Nafath verification is required to rent luxury items. Enter your
                National ID or Iqama number to begin.
              </p>
              <form onSubmit={handleNafathVerify} className="flex gap-3">
                <Input
                  value={nafathId}
                  onChange={(e) => setNafathId(e.target.value)}
                  placeholder="National ID / Iqama"
                  className="flex-1"
                  required
                />
                <Button
                  type="submit"
                  disabled={nafathLoading}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {nafathLoading ? "Verifying..." : "Verify"}
                </Button>
              </form>
              {nafathMsg && (
                <div className="mt-3 text-sm text-amber-800 bg-amber-100 border border-amber-200 rounded p-2">
                  {nafathMsg}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
