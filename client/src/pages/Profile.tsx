import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  Phone,
  Mail,
  BadgeCheck,
  Lock,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  ultra_high: "bg-red-100 text-red-800",
};

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await authApi.updateProfile({
        fullName: fullName || undefined,
        phone: phone || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg({ type: "ok", text: "Profile updated" });
    } catch (err) {
      setProfileMsg({ type: "err", text: (err as Error).message });
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg(null);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwMsg({ type: "ok", text: "Password changed" });
      setCurrentPw("");
      setNewPw("");
    } catch (err) {
      setPwMsg({ type: "err", text: (err as Error).message });
    } finally {
      setPwLoading(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-neutral-500 mb-8">
        Manage your account details and security.
      </p>

      <div className="grid gap-6">
        {/* Identity card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
                <User className="w-7 h-7 text-neutral-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{user.fullName}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
              <Badge className="ml-auto capitalize">{user.role.replace("_", " ")}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  Trust score
                </div>
                <p className="text-xl font-bold">{user.trustScore}/100</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  Risk
                </div>
                <Badge className={RISK_COLORS[user.riskCategory] ?? ""}>
                  {user.riskCategory.replace("_", " ")}
                </Badge>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Nafath
                </div>
                <p className={`font-semibold ${user.nafathVerified ? "text-green-600" : "text-red-600"}`}>
                  {user.nafathVerified ? "Verified" : "Unverified"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  KYC
                </div>
                <p className="font-semibold capitalize">{user.kycStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Edit profile</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                  required
                  minLength={2}
                />
              </div>
              <div>
                <Label>Phone (Saudi mobile)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                  className="mt-1"
                />
              </div>
              {profileMsg && (
                <p className={`text-sm ${profileMsg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
                  {profileMsg.text}
                </p>
              )}
              <Button type="submit" disabled={profileLoading}>
                <Save className="w-4 h-4 mr-1" />
                {profileLoading ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Change password</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 8 characters"
                  className="mt-1"
                  required
                  minLength={8}
                />
              </div>
              {pwMsg && (
                <p className={`text-sm ${pwMsg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
                  {pwMsg.text}
                </p>
              )}
              <Button type="submit" disabled={pwLoading} variant="outline">
                <Lock className="w-4 h-4 mr-1" />
                {pwLoading ? "Changing…" : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Nafath verification (if not yet verified) */}
        {!user.nafathVerified && (
          <NafathCard />
        )}
      </div>
    </div>
  );
}

function NafathCard() {
  const qc = useQueryClient();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const result = await authApi.nafathVerify(nationalId);
      if (result.status === "verified") {
        setMsg({ type: "ok", text: "Nafath verified successfully" });
        await qc.invalidateQueries({ queryKey: ["me"] });
      } else {
        setMsg({ type: "err", text: `Verification status: ${result.status}` });
      }
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-amber-300 bg-amber-50/30">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-2">Nafath identity verification</h2>
        <p className="text-sm text-neutral-600 mb-4">
          Verify your Saudi national identity to unlock rental features and legal signing.
        </p>
        <form onSubmit={verify} className="flex gap-2">
          <Input
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="10-digit National ID"
            pattern="[12]\d{9}"
            required
            className="max-w-xs"
          />
          <Button type="submit" disabled={loading} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
            <BadgeCheck className="w-4 h-4 mr-1" />
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>
        {msg && (
          <p className={`mt-2 text-sm ${msg.type === "ok" ? "text-green-700" : "text-red-700"}`}>
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
