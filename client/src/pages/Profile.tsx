import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Lock, Save, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi, type User } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileInit, setProfileInit] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!profileInit && user) {
    setFullName(user.fullName);
    setPhone(user.phoneE164 ?? "");
    setProfileInit(true);
  }

  async function handleProfileSave() {
    setProfileMsg(null);
    try {
      const updated = await profileApi.update({ fullName, phone: phone || undefined });
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      qc.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg({ type: "ok", text: "Profile updated" });
    } catch (err) {
      setProfileMsg({ type: "err", text: (err as Error).message });
    }
  }

  async function handlePasswordChange() {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Passwords do not match" });
      return;
    }
    try {
      await profileApi.changePassword(curPw, newPw);
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg({ type: "ok", text: "Password changed" });
    } catch (err) {
      setPwMsg({ type: "err", text: (err as Error).message });
    }
  }

  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!user) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account settings.</p>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-7 h-7 text-neutral-950" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user.fullName}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
              <Badge className="ml-auto">{user.role.replace(/_/g, " ")}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">Trust score:</span>
                <span className="font-medium">{user.trustScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">KYC:</span>
                <Badge variant={user.kycStatus === "verified" ? "default" : "outline"}>
                  {user.kycStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Nafath:</span>
                <Badge variant={user.nafathVerified ? "default" : "outline"}>
                  {user.nafathVerified ? "Verified" : "Not verified"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Risk:</span>
                <Badge variant="outline">{user.riskCategory}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Phone (Saudi format)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleProfileSave} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                  <Save className="w-4 h-4 mr-1.5" />
                  Save changes
                </Button>
                {profileMsg && (
                  <span className={profileMsg.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                    {profileMsg.text}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-neutral-400" />
              <h2 className="font-semibold text-lg">Change password</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Current password</Label>
                <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
              </div>
              <div>
                <Label>New password</Label>
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <div>
                <Label>Confirm new password</Label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handlePasswordChange} variant="outline">
                  <Lock className="w-4 h-4 mr-1.5" />
                  Update password
                </Button>
                {pwMsg && (
                  <span className={pwMsg.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                    {pwMsg.text}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
