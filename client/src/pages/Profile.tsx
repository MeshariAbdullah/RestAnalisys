import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Key, Phone, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? "");
      setPhone((user as any).phoneE164 ?? "");
    }
  }, [user]);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const updates: Record<string, string> = {};
      if (fullName && fullName !== user?.fullName) updates.fullName = fullName;
      if (phone) updates.phone = phone;
      if (Object.keys(updates).length === 0) {
        setProfileMsg({ ok: false, text: "No changes to save" });
        return;
      }
      await authApi.updateProfile(updates);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg({ ok: true, text: "Profile updated" });
    } catch (err) {
      setProfileMsg({ ok: false, text: (err as Error).message });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "Passwords do not match" });
      setPwLoading(false);
      return;
    }
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwMsg({ ok: true, text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message });
    } finally {
      setPwLoading(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account settings</p>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user.fullName}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
              <Badge className="ml-auto bg-neutral-900 text-white">
                {user.role.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${user.nafathVerified ? "text-green-600" : "text-neutral-400"}`} />
                <span>Nafath {user.nafathVerified ? "Verified" : "Unverified"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className={`w-4 h-4 ${(user as any).phoneVerified ? "text-green-600" : "text-neutral-400"}`} />
                <span>Phone {(user as any).phoneVerified ? "Verified" : "Unverified"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className={`w-4 h-4 ${(user as any).emailVerified ? "text-green-600" : "text-neutral-400"}`} />
                <span>Email {(user as any).emailVerified ? "Verified" : "Unverified"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${user.kycStatus === "verified" ? "text-green-600" : "text-neutral-400"}`} />
                <span>KYC {user.kycStatus}</span>
              </div>
            </div>

            {user.trustScore != null && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-neutral-500">Trust Score</p>
                <p className="text-2xl font-bold">{user.trustScore}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">Edit Profile</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone (Saudi format: +9665XXXXXXXX)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  className="mt-1"
                />
              </div>
              {profileMsg && (
                <p className={`text-sm p-2 rounded ${profileMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {profileMsg.text}
                </p>
              )}
              <Button
                type="submit"
                disabled={profileLoading}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {profileLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-neutral-700" />
              <h2 className="font-semibold text-lg">Change Password</h2>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
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
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  required
                  minLength={8}
                />
              </div>
              {pwMsg && (
                <p className={`text-sm p-2 rounded ${pwMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {pwMsg.text}
                </p>
              )}
              <Button
                type="submit"
                disabled={pwLoading}
                variant="outline"
              >
                {pwLoading ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
