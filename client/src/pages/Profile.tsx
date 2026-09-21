import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Shield, BadgeCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import Layout from "@/components/Layout";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updates: Record<string, string> = {};
      if (fullName !== user?.fullName) updates.fullName = fullName;
      if (phone !== (user?.phoneE164 ?? "")) updates.phone = phone;
      if (currentPassword && newPassword) {
        updates.currentPassword = currentPassword;
        updates.newPassword = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        setMessage({ type: "error", text: "No changes to save" });
        setSaving(false);
        return;
      }

      const updated = await profileApi.update(updates);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ type: "success", text: "Profile updated successfully" });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) return <Layout><div className="p-8">Loading...</div></Layout>;

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    ultra_high: "bg-red-100 text-red-800",
  };

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.fullName}</h1>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-neutral-500">Trust Score</p>
                <p className="text-2xl font-bold">{user.trustScore}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BadgeCheck className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-neutral-500">KYC Status</p>
                <Badge className={user.kycStatus === "verified" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                  {user.kycStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-neutral-500">Risk Category</p>
                <Badge className={riskColors[user.riskCategory] ?? ""}>
                  {user.riskCategory.replace("_", " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold">Edit Profile</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone (Saudi)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9665XXXXXXXX"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-neutral-500 text-xs">Email (read-only)</Label>
                <Input value={user.email} disabled className="mt-1 bg-neutral-50" />
              </div>

              <hr />

              <h3 className="text-sm font-semibold text-neutral-600">Change Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-neutral-500 space-y-1">
                  <p>Nafath: {user.nafathVerified ? "Verified" : "Not verified"}</p>
                  {user.nationalId && <p>National ID: {user.nationalId}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {message && (
            <div
              className={`mt-4 text-sm rounded p-3 border ${
                message.type === "success"
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-red-700 bg-red-50 border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-6">
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
