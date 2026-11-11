import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi, type User } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";
import {
  User as UserIcon,
  Shield,
  Mail,
  CreditCard,
  Lock,
  CheckCircle,
  XCircle,
  Star,
} from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phoneE164, setPhoneE164] = useState(user?.phoneE164 ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    authApi.me().then((u) => {
      setUser(u);
      setFullName(u.fullName);
      setPhoneE164(u.phoneE164 ?? "");
    });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const updated = await profileApi.update({ fullName, phoneE164 });
      setUser(updated);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setSaveMsg("Profile updated");
    } catch (err: any) {
      setSaveMsg(err.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg("Password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    setPwMsg("");
    try {
      await profileApi.changePassword(currentPassword, newPassword);
      setPwMsg("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMsg(err.message ?? "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  }

  function verificationBadge(verified: boolean) {
    return verified ? (
      <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle className="w-3 h-3 mr-1" /> Verified
      </Badge>
    ) : (
      <Badge variant="secondary">
        <XCircle className="w-3 h-3 mr-1" /> Unverified
      </Badge>
    );
  }

  if (!user) return null;

  return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.fullName}</h1>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" /> Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">Nafath</span>
                {verificationBadge(user.nafathVerified)}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">KYC</span>
                <Badge variant={user.kycStatus === "verified" ? "default" : "secondary"}
                  className={user.kycStatus === "verified" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                  {user.kycStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">Trust Score</span>
                <Badge variant="outline">{user.trustScore}/100</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">Risk</span>
                <Badge variant="outline">{user.riskCategory}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (Saudi mobile)</Label>
                <Input
                  id="phone"
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                />
              </div>
              {saveMsg && (
                <p className={`text-sm ${saveMsg.includes("update") ? "text-green-600" : "text-red-600"}`}>
                  {saveMsg}
                </p>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-4 h-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {pwMsg && (
                <p className={`text-sm ${pwMsg.includes("changed") ? "text-green-600" : "text-red-600"}`}>
                  {pwMsg}
                </p>
              )}
              <Button type="submit" disabled={pwSaving} variant="outline">
                {pwSaving ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
