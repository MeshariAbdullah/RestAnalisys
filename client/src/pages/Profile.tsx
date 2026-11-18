import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

function roleLabel(role: User["role"]): string {
  return {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  }[role];
}

function riskColor(cat: string): string {
  switch (cat) {
    case "low": return "bg-green-100 text-green-800";
    case "medium": return "bg-amber-100 text-amber-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "ultra_high": return "bg-red-100 text-red-800";
    default: return "bg-neutral-100 text-neutral-800";
  }
}

export default function Profile() {
  const queryClient = useQueryClient();
  const cachedUser = getCurrentUser();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    initialData: cachedUser ?? undefined,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: (data: { fullName?: string; phone?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    },
    onError: (err: Error) => {
      setProfileMsg({ type: "error", text: err.message });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
    },
    onError: (err: Error) => {
      setPasswordMsg({ type: "error", text: err.message });
    },
  });

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    const data: { fullName?: string; phone?: string } = {};
    if (fullName && fullName !== user?.fullName) data.fullName = fullName;
    if (phone && phone !== (user?.phoneE164 ?? "")) data.phone = phone;
    if (Object.keys(data).length === 0) {
      setProfileMsg({ type: "error", text: "No changes to save." });
      return;
    }
    profileMutation.mutate(data);
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-neutral-500 mt-1">Manage your account settings</p>
      </header>

      {/* Account overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-7 h-7 text-neutral-950" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.fullName}</h2>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
            <Badge className="ml-auto bg-neutral-900 text-white">
              {roleLabel(user.role)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-neutral-500 mb-1">Trust Score</p>
              <p className="text-2xl font-bold">{user.trustScore}</p>
              <p className="text-xs text-neutral-400">/ 100</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-neutral-500 mb-1">Risk Category</p>
              <Badge className={riskColor(user.riskCategory)}>
                {user.riskCategory}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-neutral-500 mb-1">Nafath ID</p>
              <div className="flex items-center gap-1.5">
                {user.nafathVerified ? (
                  <>
                    <BadgeCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-600">Unverified</span>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-neutral-500 mb-1">KYC Status</p>
              <Badge
                className={
                  user.kycStatus === "verified"
                    ? "bg-green-100 text-green-800"
                    : user.kycStatus === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-neutral-100 text-neutral-700"
                }
              >
                {user.kycStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" /> Edit Profile
          </h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (Saudi)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  className="pl-9"
                />
              </div>
            </div>

            {profileMsg && (
              <div
                className={`text-sm rounded p-2 flex items-center gap-2 ${
                  profileMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {profileMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {profileMsg.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={profileMutation.isPending}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Change Password
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            {passwordMsg && (
              <div
                className={`text-sm rounded p-2 flex items-center gap-2 ${
                  passwordMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {passwordMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {passwordMsg.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {passwordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Security
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-neutral-600">National ID</span>
              <span className="font-medium">
                {user.nationalId
                  ? `${user.nationalId.slice(0, 3)}****${user.nationalId.slice(-2)}`
                  : "Not provided"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-neutral-600">Nafath Verified</span>
              <Badge className={user.nafathVerified ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-700"}>
                {user.nafathVerified ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-600">Account Status</span>
              <Badge className={user.isBlocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                {user.isBlocked ? "Blocked" : "Active"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
