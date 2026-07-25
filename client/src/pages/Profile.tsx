import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Key, Phone, MapPin, Shield, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import Layout from "@/components/Layout";

export default function Profile() {
  const queryClient = useQueryClient();
  const user = getCurrentUser();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  const current = profile ?? user;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  React.useEffect(() => {
    if (current) {
      setFullName(current.fullName ?? "");
      setPhone(current.phoneE164 ?? "");
    }
  }, [current?.fullName, current?.phoneE164]);

  const profileMutation = useMutation({
    mutationFn: (data: { fullName?: string; phone?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updated) => {
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setProfileMsg("Profile updated successfully");
      setTimeout(() => setProfileMsg(""), 3000);
    },
    onError: (err: Error) => setProfileMsg(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      setPasswordMsg("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    },
    onError: (err: Error) => setPasswordMsg(err.message),
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updates: { fullName?: string; phone?: string } = {};
    if (fullName !== current?.fullName) updates.fullName = fullName;
    if (phone !== (current?.phoneE164 ?? "")) updates.phone = phone;
    if (Object.keys(updates).length === 0) return;
    profileMutation.mutate(updates);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  if (!current) return null;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-neutral-500 mb-8">
          Manage your account settings and security.
        </p>

        <div className="space-y-6">
          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" /> Account Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">Email</span>
                  <p className="font-medium">{current.email}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Role</span>
                  <p className="font-medium capitalize">
                    {current.role.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Trust Score</span>
                  <p className="font-medium">{current.trustScore}/100</p>
                </div>
                <div>
                  <span className="text-neutral-500">KYC Status</span>
                  <Badge
                    className={
                      current.kycStatus === "verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {current.nafathVerified && (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    {current.kycStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" /> Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (Saudi)</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-neutral-400" />
                    <Input
                      id="phone"
                      placeholder="+9665XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                {profileMsg && (
                  <p
                    className={`text-sm ${
                      profileMsg.includes("success")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {profileMsg}
                  </p>
                )}
                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5" /> Change Password
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
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 digit
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {passwordMsg && (
                  <p
                    className={`text-sm ${
                      passwordMsg.includes("success")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {passwordMsg}
                  </p>
                )}
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending
                    ? "Changing..."
                    : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
