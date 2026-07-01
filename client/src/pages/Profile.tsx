import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Lock, Phone, MapPin, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi, type User as UserType } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

function StatusBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <Badge variant={verified ? "default" : "secondary"} className={verified ? "bg-green-100 text-green-800" : ""}>
      {verified ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
      {label}: {verified ? "Verified" : "Unverified"}
    </Badge>
  );
}

export default function Profile() {
  const qc = useQueryClient();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: (data: { fullName?: string; phone?: string }) =>
      profileApi.update(data),
    onSuccess: (updated) => {
      const stored = getCurrentUser();
      if (stored) saveSession(localStorage.getItem("auth_token")!, { ...stored, ...updated });
      qc.invalidateQueries({ queryKey: ["me"] });
      setSuccess("Profile updated successfully");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const changePassword = useMutation({
    mutationFn: () => profileApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed successfully");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updates: Record<string, string> = {};
    if (fullName !== user?.fullName) updates.fullName = fullName;
    if (phone !== (user?.phoneE164 ?? "")) updates.phone = phone;
    if (Object.keys(updates).length === 0) return;
    updateProfile.mutate(updates);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    changePassword.mutate();
  }

  if (isLoading) {
    return <div className="p-8 animate-pulse"><div className="h-96 bg-neutral-100 rounded-xl" /></div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <User className="w-6 h-6" /> Profile Settings
      </h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Account Status
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{user?.role?.replace("_", " ")}</Badge>
            <Badge variant="outline">Trust: {user?.trustScore}/100</Badge>
            <Badge variant="outline">Risk: {user?.riskCategory}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge verified={user?.nafathVerified ?? false} label="Nafath" />
            <StatusBadge verified={user?.kycStatus === "verified"} label="KYC" />
          </div>
          <p className="text-xs text-neutral-400 mt-3">{user?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" /> Personal Information
          </h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+9665XXXXXXXX"
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" /> Change Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                minLength={8}
                required
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                minLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
