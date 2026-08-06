import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function Profile() {
  const cached = getCurrentUser();
  const [user, setUser] = useState<User | null>(cached);
  const [fullName, setFullName] = useState(cached?.fullName ?? "");
  const [phone, setPhone] = useState(cached?.phoneE164 ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    authApi.me().then((u) => {
      setUser(u);
      setFullName(u.fullName);
      setPhone(u.phoneE164 ?? "");
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data: Record<string, string> = {};
      if (fullName !== user?.fullName) data.fullName = fullName;
      if (phone !== (user?.phoneE164 ?? "")) data.phone = phone;
      if (currentPassword && newPassword) {
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
      }
      if (Object.keys(data).length === 0) {
        setMessage({ type: "error", text: "No changes to save" });
        setSaving(false);
        return;
      }
      const updated = await authApi.updateProfile(data);
      setUser(updated);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message ?? "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Profile Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 w-32">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 w-32">Role</span>
              <Badge variant="outline">{user.role.replace("_", " ")}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 w-32">Trust Score</span>
              <span className="text-sm font-medium">{user.trustScore}/100</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 w-32">KYC Status</span>
              <Badge
                variant={user.kycStatus === "verified" ? "default" : "secondary"}
              >
                {user.kycStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 w-32">Nafath</span>
              <Badge variant={user.nafathVerified ? "default" : "secondary"}>
                {user.nafathVerified ? "Verified" : "Not Verified"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Saudi)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                />
              </div>

              <hr className="my-4" />
              <p className="text-sm text-neutral-500">
                Leave password fields empty to keep your current password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars"
                />
              </div>

              {message && (
                <p
                  className={`text-sm ${
                    message.type === "success" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {message.text}
                </p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
