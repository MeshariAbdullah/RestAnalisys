import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User as UserIcon,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi } from "@/lib/api";
import type { User } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

function TrustScoreBar({ score, riskCategory }: { score: number; riskCategory: string }) {
  const barColor =
    riskCategory === "low"
      ? "bg-green-500"
      : riskCategory === "medium"
      ? "bg-yellow-500"
      : riskCategory === "high"
      ? "bg-orange-500"
      : "bg-red-500";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-neutral-700">Trust Score</span>
        <span className="text-sm font-bold">{score}/100</span>
      </div>
      <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <p className="text-xs text-neutral-500 capitalize">
        Risk category: <span className="font-medium">{riskCategory.replace("_", " ")}</span>
      </p>
    </div>
  );
}

function VerificationBadge({
  label,
  verified,
  icon: Icon,
}: {
  label: string;
  verified: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        verified
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-neutral-50 border-neutral-200 text-neutral-500"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
      {verified ? (
        <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 ml-auto text-neutral-400" />
      )}
    </div>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();

  // Fetch fresh user data
  const { data: user } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    initialData: getCurrentUser() ?? undefined,
  });

  // Edit profile form state
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phoneE164, setPhoneE164] = useState(user?.phoneE164 ?? "");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: (data: { fullName?: string; phoneE164?: string }) => profileApi.update(data),
    onSuccess: (updatedUser) => {
      // Update local storage and query cache
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updatedUser);
      queryClient.setQueryData(["auth", "me"], updatedUser);
      setProfileMsg({ type: "success", text: "Profile updated successfully" });
      setTimeout(() => setProfileMsg(null), 4000);
    },
    onError: (err: Error) => {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile" });
    },
  });

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword(data),
    onSuccess: () => {
      setPasswordMsg({ type: "success", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(null), 4000);
    },
    onError: (err: Error) => {
      setPasswordMsg({ type: "error", text: err.message || "Failed to change password" });
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    updateProfile.mutate({ fullName, phoneE164 });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }

  if (!user) return null;

  const kycBadgeVariant =
    user.kycStatus === "verified"
      ? "success"
      : user.kycStatus === "pending"
      ? "warning"
      : user.kycStatus === "rejected"
      ? "error"
      : "secondary";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
        <p className="text-neutral-500 text-sm mt-1">Manage your account settings</p>
      </div>

      {/* User Info Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-neutral-950" />
            </div>
            <div>
              <CardTitle className="text-xl">{user.fullName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize">
                  {user.role.replace("_", " ")}
                </Badge>
                <Badge variant={kycBadgeVariant}>KYC: {user.kycStatus}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Phone className="w-4 h-4" />
                <span>{user.phoneE164 || "Not set"}</span>
              </div>
            </div>
            <TrustScoreBar score={user.trustScore} riskCategory={user.riskCategory} />
          </div>
        </CardContent>
      </Card>

      {/* Verification Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <VerificationBadge
              label="Nafath"
              verified={user.nafathVerified}
              icon={Shield}
            />
            <VerificationBadge
              label="KYC"
              verified={user.kycStatus === "verified"}
              icon={CheckCircle}
            />
            <VerificationBadge
              label="Phone"
              verified={!!user.phoneE164}
              icon={Phone}
            />
            <VerificationBadge
              label="Email"
              verified={!!user.email}
              icon={Mail}
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="phoneE164">Phone (E.164 format)</Label>
              <Input
                id="phoneE164"
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                className="mt-1"
                placeholder="+966501234567"
              />
            </div>

            {profileMsg && (
              <div
                className={`text-sm p-3 rounded-md ${
                  profileMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <Button
              type="submit"
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
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
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
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
                className="mt-1"
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
                className="mt-1"
                required
              />
            </div>

            {passwordMsg && (
              <div
                className={`text-sm p-3 rounded-md ${
                  passwordMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <Button
              type="submit"
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
