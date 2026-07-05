import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  User as UserIcon,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi } from "@/lib/api";
import { saveSession } from "@/lib/auth";

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

  React.useEffect(() => {
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
      const payload: Record<string, string> = {};
      if (fullName !== user?.fullName) payload.fullName = fullName;
      if (phone !== (user?.phoneE164 ?? "")) payload.phoneE164 = phone;
      if (currentPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        setMessage({ type: "ok", text: "No changes to save." });
        return;
      }
      const updated = await profileApi.update(payload);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ type: "ok", text: "Profile updated successfully." });
    } catch (err) {
      setMessage({ type: "err", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account details</p>

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Verification status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusPill label="Nafath" verified={user.nafathVerified} />
              <StatusPill label="KYC" verified={user.kycStatus === "verified"} />
              <StatusPill label="Phone" verified={!!user.phoneE164} />
              <StatusPill label="Email" verified={true} />
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="text-neutral-500">Trust score</span>
              <Badge
                className={
                  user.trustScore >= 70
                    ? "bg-green-100 text-green-800"
                    : user.trustScore >= 40
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {user.trustScore}/100 ({user.riskCategory})
              </Badge>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSave}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="font-semibold flex items-center gap-2">
                <UserIcon className="w-5 h-5" /> Personal info
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="mt-1 bg-neutral-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>
                    <Phone className="w-3 h-3 inline mr-1" />
                    Phone
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input value={user.role} disabled className="mt-1 bg-neutral-50" />
                </div>
              </div>

              {user.nationalId && (
                <div>
                  <Label>National ID</Label>
                  <Input value={user.nationalId} disabled className="mt-1 bg-neutral-50" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5" /> Change password
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {message && (
            <div
              className={`mt-4 text-sm rounded p-3 border ${
                message.type === "ok"
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
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusPill({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
        verified ? "border-green-200 bg-green-50" : "border-neutral-200"
      }`}
    >
      {verified ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-neutral-400" />
      )}
      <span className={verified ? "text-green-800" : "text-neutral-500"}>{label}</span>
    </div>
  );
}
