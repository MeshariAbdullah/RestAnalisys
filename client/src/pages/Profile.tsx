import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCircle, Save, Lock, ShieldCheck, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { profileApi, type ProfileData } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phoneE164 ?? "");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await profileApi.update({
        fullName: fullName || undefined,
        phoneE164: phone || undefined,
      });
      qc.invalidateQueries({ queryKey: ["profile"] });
      setSaveMsg("Profile updated successfully.");
    } catch (err) {
      setSaveMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg(null);
    try {
      await profileApi.changePassword(curPass, newPass);
      setPassMsg("Password changed successfully.");
      setCurPass("");
      setNewPass("");
    } catch (err) {
      setPassMsg((err as Error).message);
    } finally {
      setPassLoading(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!profile) return <div className="p-8">Unable to load profile.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <UserCircle className="w-7 h-7 text-neutral-700" />
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Account Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Nafath:</span>
                <Badge variant={profile.nafathVerified ? "default" : "secondary"}>
                  {profile.nafathVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Phone:</span>
                <Badge variant={profile.phoneVerified ? "default" : "secondary"}>
                  {profile.phoneVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                <span>Email:</span>
                <Badge variant={profile.emailVerified ? "default" : "secondary"}>
                  {profile.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Trust Score:</span>
                <Badge>{profile.trustScore}/100</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Personal Information</h2>
            <form onSubmit={handleSave} className="space-y-4">
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
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="mt-1 bg-neutral-50" />
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
                <div>
                  <Label>Role</Label>
                  <Input
                    value={profile.role.replace(/_/g, " ")}
                    disabled
                    className="mt-1 bg-neutral-50 capitalize"
                  />
                </div>
              </div>

              {saveMsg && (
                <p className={`text-sm ${saveMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                  {saveMsg}
                </p>
              )}

              <Button type="submit" disabled={saving} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                <Save className="w-4 h-4 mr-1" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={curPass}
                    onChange={(e) => setCurPass(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="mt-1"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              {passMsg && (
                <p className={`text-sm ${passMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
                  {passMsg}
                </p>
              )}

              <Button type="submit" variant="outline" disabled={passLoading}>
                {passLoading ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
