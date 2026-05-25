import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  BadgeCheck,
  Phone,
  Mail,
  Calendar,
  Save,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import Layout from "@/components/Layout";

function riskBadge(category: string) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    ultra_high: "bg-red-100 text-red-700",
  };
  return colors[category] ?? "bg-neutral-100 text-neutral-700";
}

function kycBadge(status: string) {
  const colors: Record<string, string> = {
    verified: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    unverified: "bg-neutral-100 text-neutral-700",
    rejected: "bg-red-100 text-red-700",
  };
  return colors[status] ?? "bg-neutral-100 text-neutral-700";
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhoneE164(user.phoneE164 ?? "");
    }
  }, [user]);

  async function handleProfileSave() {
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const updated = await authApi.updateProfile({ fullName, phoneE164: phoneE164 || undefined });
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg("Profile updated successfully.");
    } catch (err: any) {
      setProfileMsg(err.message ?? "Failed to update profile");
    }
    setProfileSaving(false);
  }

  async function handlePasswordChange() {
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
      await authApi.changePassword(currentPassword, newPassword);
      setPwMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMsg(err.message ?? "Failed to change password");
    }
    setPwSaving(false);
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <UserIcon className="w-6 h-6" />
          My Profile
        </h1>

        {/* Account Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Role</p>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  {user?.role?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Trust Score</p>
                <p className="text-2xl font-bold">{user?.trustScore ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Risk Category</p>
                <Badge variant="secondary" className={riskBadge(user?.riskCategory ?? "medium")}>
                  {user?.riskCategory?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">KYC Status</p>
                <Badge variant="secondary" className={kycBadge(user?.kycStatus ?? "unverified")}>
                  {user?.kycStatus?.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 text-sm text-neutral-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
              {user?.phoneE164 && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  {user.phoneE164}
                </div>
              )}
              {user?.nafathVerified && (
                <div className="flex items-center gap-1.5 text-green-600">
                  <BadgeCheck className="w-4 h-4" />
                  Nafath Verified
                </div>
              )}
              {(user as any)?.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Member since {new Date((user as any).createdAt).toLocaleDateString("en-SA")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Phone (E.164)</label>
              <Input
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                placeholder="+966512345678"
                className="mt-1"
              />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {profileMsg}
              </p>
            )}
            <Button onClick={handleProfileSave} disabled={profileSaving}>
              <Save className="w-4 h-4 mr-1.5" />
              {profileSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            {pwMsg && (
              <p className={`text-sm flex items-center gap-1.5 ${pwMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {!pwMsg.includes("success") && <AlertCircle className="w-4 h-4" />}
                {pwMsg}
              </p>
            )}
            <Button onClick={handlePasswordChange} disabled={pwSaving} variant="outline">
              <Lock className="w-4 h-4 mr-1.5" />
              {pwSaving ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
