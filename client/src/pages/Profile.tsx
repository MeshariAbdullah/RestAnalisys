import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Save,
  Lock,
  User as UserIcon,
  Phone,
  Landmark,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { authApi, type User } from "@/lib/api";
import { saveSession } from "@/lib/auth";

function kycBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-700 border-0">Verified</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 border-0">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 border-0">Rejected</Badge>;
    default:
      return <Badge className="bg-neutral-100 text-neutral-600 border-0">Unverified</Badge>;
  }
}

function trustColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => authApi.me() as Promise<User & { iban?: string | null }>,
  });

  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [iban, setIban] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? "");
      setPhoneE164(user.phoneE164 ?? "");
      setIban(user.iban ?? "");
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof authApi.updateProfile>[0]) =>
      authApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      const token = localStorage.getItem("auth_token");
      if (token) {
        saveSession(token, updated);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Profile updated successfully." });
    },
    onError: (err: Error & { status?: number }) => {
      setMessage({ type: "error", text: err.message || "Failed to update profile." });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    const payload: Record<string, string> = {};
    if (fullName !== (user?.fullName ?? "")) payload.fullName = fullName;
    if (phoneE164 !== (user?.phoneE164 ?? "")) payload.phoneE164 = phoneE164;
    if (user?.role === "owner" && iban !== (user?.iban ?? "")) {
      payload.iban = iban;
    }
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setMessage({ type: "error", text: "No changes to save." });
      return;
    }

    mutation.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const trustScore = user.trustScore ?? 50;
  const role = user.role;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account settings and preferences.</p>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-amber-500" />
              Account Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-sm text-neutral-500">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <Input id="email" value={user.email} disabled className="bg-neutral-50" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-neutral-500">Role</Label>
                <div className="mt-2.5">
                  <Badge className="bg-amber-100 text-amber-800 border-0 capitalize">
                    {(role).replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <Label htmlFor="fullName" className="text-sm text-neutral-500">Full Name</Label>
                <div className="flex items-center gap-2 mt-1">
                  <UserIcon className="w-4 h-4 text-neutral-400" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm text-neutral-500">Phone</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <Input
                    id="phone"
                    value={phoneE164}
                    onChange={(e) => setPhoneE164(e.target.value)}
                    placeholder="+966 5XXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {role === "owner" && (
              <div className="mt-4">
                <Label htmlFor="iban" className="text-sm text-neutral-500">IBAN (for payouts)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Landmark className="w-4 h-4 text-neutral-400" />
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="SA0000000000000000000000"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Saudi IBAN: SA followed by 22 digits</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Verification & Trust
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Nafath ID</p>
                {user.nafathVerified ? (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-700 border-0">Verified</Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldX className="w-5 h-5 text-neutral-400" />
                    <Badge className="bg-neutral-100 text-neutral-600 border-0">Not verified</Badge>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">KYC Status</p>
                {kycBadge(user.kycStatus)}
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Risk Category</p>
                <Badge
                  className={`border-0 capitalize ${
                    user.riskCategory === "low"
                      ? "bg-green-100 text-green-700"
                      : user.riskCategory === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.riskCategory.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-neutral-500">Trust Score</p>
                <p className="text-sm font-semibold">{trustScore} / 100</p>
              </div>
              <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${trustColor(trustScore)}`}
                  style={{ width: `${trustScore}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Change Password
            </h2>
            <p className="text-sm text-neutral-500 mb-4">Leave blank to keep your current password.</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-sm text-neutral-500">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword" className="text-sm text-neutral-500">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm text-neutral-500">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-medium px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
