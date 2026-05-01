import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Key, Phone, Mail, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, formatSar } from "@/lib/api";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";

export default function Profile() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const user = meQuery.data;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ fullName, phone: phone || undefined }),
    onSuccess: (data) => {
      setProfileMsg("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      if (currentUser) {
        setCurrentUser({ ...currentUser, fullName: data.fullName });
      }
    },
    onError: (err: Error) => setProfileMsg(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordMsg("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => setPasswordMsg(err.message),
  });

  if (!user) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <User className="w-7 h-7" /> My Profile
      </h1>
      <p className="text-neutral-500 mb-8">Manage your account details and security.</p>

      {/* Account Overview */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Account Overview</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Email</span>
              <p className="font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Role</span>
              <p className="capitalize font-medium">{user.role.replace(/_/g, " ")}</p>
            </div>
            <div>
              <span className="text-neutral-500">Trust Score</span>
              <p className="font-medium">{user.trustScore} / 100</p>
            </div>
            <div>
              <span className="text-neutral-500">Risk Category</span>
              <Badge variant={
                user.riskCategory === "low" ? "default"
                : user.riskCategory === "medium" ? "secondary"
                : "destructive"
              }>{user.riskCategory}</Badge>
            </div>
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t text-sm">
            <div className="flex items-center gap-1.5">
              {user.nafathVerified ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Nafath {user.nafathVerified ? "Verified" : "Not Verified"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={user.kycStatus === "verified" ? "default" : "secondary"}>
                KYC: {user.kycStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Edit Profile</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (Saudi +9665XXXXXXXX)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966500000000"
              />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {profileMsg}
              </p>
            )}
            <Button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Key className="w-4 h-4" /> Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPw">Current Password</Label>
              <Input
                id="currentPw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newPw">New Password</Label>
              <Input
                id="newPw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <Input
                id="confirmPw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {passwordMsg}
              </p>
            )}
            <Button
              onClick={() => {
                if (newPassword !== confirmPassword) {
                  setPasswordMsg("Passwords do not match");
                  return;
                }
                passwordMutation.mutate();
              }}
              disabled={passwordMutation.isPending || !currentPassword || !newPassword}
              variant="outline"
            >
              {passwordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
