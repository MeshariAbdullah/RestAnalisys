import React, { useState, useEffect } from "react";
import { profileApi, type User } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User as UserIcon, Lock, MapPin } from "lucide-react";
import { formatDate, getScoreBg } from "@/lib/utils";
import { saveSession } from "@/lib/auth";

export default function Profile() {
  const [user, setUser] = useState<(User & { nationalAddressJson?: Record<string, string>; createdAt: string; lastLoginAt?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    profileApi.get().then((u) => {
      setUser(u);
      setFullName(u.fullName);
      setPhone(u.phoneE164 ?? "");
      setLoading(false);
    });
  }, []);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await profileApi.update({ fullName, phoneE164: phone || undefined });
      setUser((prev) => prev ? { ...prev, ...updated } : prev);
      const stored = localStorage.getItem("auth_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.fullName = updated.fullName;
        localStorage.setItem("auth_user", JSON.stringify(parsed));
      }
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message ?? "Failed to update" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await profileApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message ?? "Failed to change password" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500">Loading profile...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Email</span>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <span className="text-neutral-500">Role</span>
              <p><Badge variant="outline">{user.role}</Badge></p>
            </div>
            <div>
              <span className="text-neutral-500">Nafath Verified</span>
              <p>
                <Badge variant={user.nafathVerified ? "default" : "secondary"}>
                  {user.nafathVerified ? "Verified" : "Not Verified"}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-neutral-500">KYC Status</span>
              <p><Badge variant="outline">{user.kycStatus}</Badge></p>
            </div>
            <div>
              <span className="text-neutral-500">Trust Score</span>
              <p><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getScoreBg(user.trustScore)}`}>{user.trustScore}/100</span></p>
            </div>
            <div>
              <span className="text-neutral-500">Member Since</span>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-1">
            <Lock className="w-4 h-4" /> Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9665XXXXXXXX"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
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
                <Button type="submit" disabled={saving}>
                  {saving ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
