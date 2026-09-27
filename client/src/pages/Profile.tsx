import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Shield, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi, type User } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (user && !initialized) {
    setFullName(user.fullName);
    setPhone(user.phoneE164 ?? "");
    setInitialized(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {};
      if (fullName !== user?.fullName) payload.fullName = fullName;
      if (phone !== (user?.phoneE164 ?? "")) payload.phoneE164 = phone;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setMessage({ type: "ok", text: "No changes to save." });
        setSaving(false);
        return;
      }

      await authApi.updateProfile(payload);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ type: "ok", text: "Profile updated." });
    } catch (err) {
      setMessage({ type: "err", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Account settings</h1>
      <p className="text-neutral-500 mb-8">Manage your profile and security.</p>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-neutral-400" />
            </div>
            <div>
              <p className="font-semibold text-lg">{user.fullName}</p>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
            <Badge className="ml-auto bg-neutral-900 text-white">
              {user.role.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Trust score" value={String(user.trustScore)} />
            <Stat label="Risk" value={user.riskCategory} />
            <Stat
              label="Nafath"
              value={user.nafathVerified ? "Verified" : "Pending"}
            />
            <Stat label="KYC" value={user.kycStatus} />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave}>
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-neutral-500" />
              <p className="font-semibold">Personal info</p>
            </div>
            <div>
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone (Saudi mobile)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                placeholder="+9665XXXXXXXX"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-neutral-500" />
              <p className="font-semibold">Change password</p>
            </div>
            <div>
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Min 8 characters"
              />
            </div>
          </CardContent>
        </Card>

        {message && (
          <div
            className={`mb-4 text-sm rounded p-3 border ${
              message.type === "ok"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-700 bg-red-50 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-3 text-center">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-semibold capitalize mt-0.5">{value}</p>
    </div>
  );
}
