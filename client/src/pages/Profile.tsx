import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Lock, Phone, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function Profile() {
  const queryClient = useQueryClient();
  const stored = getCurrentUser();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: (data: { fullName?: string; email?: string; phone?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updated) => {
      setProfileMsg({ type: "ok", text: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
    },
    onError: (err: Error) => {
      setProfileMsg({ type: "err", text: err.message });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPwMsg({ type: "ok", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      setPwMsg({ type: "err", text: err.message });
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    const updates: Record<string, string> = {};
    if (fullName !== user?.fullName) updates.fullName = fullName;
    if (email !== user?.email) updates.email = email;
    if (phone && phone !== user?.phoneE164) updates.phone = phone;
    if (Object.keys(updates).length === 0) {
      setProfileMsg({ type: "err", text: "No changes to save" });
      return;
    }
    profileMutation.mutate(updates);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ type: "err", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "Passwords do not match" });
      return;
    }
    passwordMutation.mutate();
  }

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile & Settings</h1>
      <p className="text-neutral-500 mb-8">Manage your account information and security.</p>

      <div className="grid gap-6">
        {/* Identity status */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Verification status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusBadge
                label="Nafath"
                verified={user.nafathVerified}
              />
              <StatusBadge
                label="KYC"
                verified={user.kycStatus === "verified"}
                status={user.kycStatus}
              />
              <StatusBadge
                label="Trust Score"
                verified={user.trustScore >= 60}
                custom={`${user.trustScore}/100`}
              />
              <StatusBadge
                label="Risk"
                verified={user.riskCategory === "low"}
                custom={user.riskCategory}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal information
            </h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone (Saudi mobile)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9665XXXXXXXX"
                    className="pl-9"
                  />
                </div>
              </div>

              {profileMsg && (
                <Msg type={profileMsg.type} text={profileMsg.text} />
              )}

              <Button
                type="submit"
                disabled={profileMutation.isPending}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {profileMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password change */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change password
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="currentPw">Current password</Label>
                <Input
                  id="currentPw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="newPw">New password</Label>
                <Input
                  id="newPw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirmPw">Confirm new password</Label>
                <Input
                  id="confirmPw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {pwMsg && <Msg type={pwMsg.type} text={pwMsg.text} />}

              <Button
                type="submit"
                disabled={passwordMutation.isPending}
                variant="outline"
              >
                {passwordMutation.isPending ? "Changing..." : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  verified,
  status,
  custom,
}: {
  label: string;
  verified: boolean;
  status?: string;
  custom?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      {custom ? (
        <Badge
          variant="outline"
          className={verified ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}
        >
          {custom}
        </Badge>
      ) : (
        <Badge className={verified ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}>
          {verified ? "Verified" : status ?? "Pending"}
        </Badge>
      )}
    </div>
  );
}

function Msg({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div
      className={`text-sm rounded p-3 flex items-center gap-2 ${
        type === "ok"
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {type === "ok" ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      {text}
    </div>
  );
}
