import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Fingerprint,
  Mail,
  Phone,
  Contact,
  ShieldCheck,
  Loader2,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { toast } from "@/hooks/useToast";

function roleLabel(role: User["role"]): string {
  return {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  }[role];
}

function kycStatusBadge(status: User["kycStatus"]) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-green-100 text-green-700 border-0">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-0">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 border-0">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-neutral-100 text-neutral-600 border-0">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Unverified
        </Badge>
      );
  }
}

function riskBadge(category: User["riskCategory"]) {
  const styles: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-700",
    ultra_high: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    ultra_high: "Ultra High",
  };
  return (
    <Badge className={`border-0 ${styles[category] ?? styles.medium}`}>
      {labels[category] ?? category}
    </Badge>
  );
}

function trustScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function Profile() {
  const qc = useQueryClient();
  const cachedUser = getCurrentUser();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => authApi.me(),
    initialData: cachedUser ?? undefined,
  });

  const [nationalId, setNationalId] = useState("");
  const [nafathLoading, setNafathLoading] = useState(false);
  const [nafathResult, setNafathResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Edit profile form state
  const [editFullName, setEditFullName] = useState(cachedUser?.fullName ?? "");
  const [editPhone, setEditPhone] = useState(cachedUser?.phoneE164 ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!nationalId.trim()) return;
    setNafathLoading(true);
    setNafathResult(null);
    try {
      const res = await authApi.nafathVerify(nationalId.trim());
      setNafathResult({
        success: true,
        message: `Verification initiated (Transaction: ${res.transactionId}). Status: ${res.status}`,
      });
      await qc.invalidateQueries({ queryKey: ["profile-me"] });
    } catch (err) {
      setNafathResult({
        success: false,
        message: (err as Error).message ?? "Verification failed",
      });
    } finally {
      setNafathLoading(false);
    }
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");
    try {
      const payload: {
        fullName?: string;
        phone?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {};
      if (editFullName.trim()) payload.fullName = editFullName.trim();
      if (editPhone.trim()) payload.phone = editPhone.trim();
      if (newPassword) {
        if (newPassword.length < 8) {
          setEditError("New password must be at least 8 characters");
          setEditLoading(false);
          return;
        }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const updatedUser = await authApi.updateProfile(payload);

      // Update localStorage with the updated user
      const token = localStorage.getItem("auth_token");
      if (token) {
        saveSession(token, updatedUser);
      }

      await qc.invalidateQueries({ queryKey: ["profile-me"] });
      setEditSuccess("Profile updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Profile updated successfully", variant: "success" });
    } catch (err) {
      const message = (err as Error).message ?? "Failed to update profile";
      setEditError(message);
      toast({ title: message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  }

  if (isLoading && !user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20 text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-4">
          Failed to load profile: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
          <UserIcon className="w-7 h-7 text-neutral-950" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">{user.fullName}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline">{roleLabel(user.role)}</Badge>
            {user.isBlocked && (
              <Badge className="bg-red-100 text-red-700 border-0">
                Account Blocked
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-amber-500" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Email
                </p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Phone
                </p>
                <p className="text-sm font-medium">
                  {user.phoneE164 || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Contact className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  National ID
                </p>
                <p className="text-sm font-medium">
                  {user.nationalId || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Role
                </p>
                <p className="text-sm font-medium">{roleLabel(user.role)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Trust Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              Security & Trust
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Trust Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  Trust Score
                </p>
                <span className="text-sm font-bold">{user.trustScore}/100</span>
              </div>
              <div className="relative">
                <Progress
                  value={user.trustScore}
                  className="h-3"
                />
                <div
                  className={`absolute inset-0 h-3 rounded-full ${trustScoreColor(user.trustScore)} transition-all`}
                  style={{ width: `${user.trustScore}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {user.trustScore >= 80
                  ? "Excellent standing"
                  : user.trustScore >= 60
                    ? "Good standing"
                    : user.trustScore >= 40
                      ? "Moderate -- consider verifying your identity"
                      : "Low trust -- identity verification recommended"}
              </p>
            </div>

            {/* Risk Category */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">
                Risk Category
              </p>
              {riskBadge(user.riskCategory)}
            </div>

            {/* KYC Status */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">
                KYC Status
              </p>
              {kycStatusBadge(user.kycStatus)}
            </div>

            {/* Nafath Verification */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">
                Nafath Verified
              </p>
              {user.nafathVerified ? (
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-neutral-100 text-neutral-600 border-0">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Verified
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nafath Verification Form */}
        {!user.nafathVerified && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-amber-500" />
                Nafath Identity Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500 mb-4">
                Verify your identity through the Nafath national identity system.
                Enter your 10-digit National ID to initiate the verification process.
              </p>

              <form onSubmit={handleNafathVerify} className="space-y-4">
                <div>
                  <Label htmlFor="nationalId">National ID</Label>
                  <Input
                    id="nationalId"
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="mt-1 max-w-sm"
                    maxLength={10}
                    pattern="\d{10}"
                    title="National ID must be exactly 10 digits"
                    required
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    Your 10-digit Saudi National ID number
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={nafathLoading || !nationalId.trim()}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {nafathLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Verify with Nafath
                    </>
                  )}
                </Button>
              </form>

              {nafathResult && (
                <div
                  className={`mt-4 text-sm rounded p-3 border ${
                    nafathResult.success
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-red-700 bg-red-50 border-red-200"
                  }`}
                >
                  {nafathResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="mt-1 max-w-sm"
                />
              </div>

              <div>
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+966XXXXXXXXX"
                  className="mt-1 max-w-sm"
                />
              </div>

              <hr className="border-neutral-200 my-2" />

              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required only when changing password"
                  className="mt-1 max-w-sm"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="mt-1 max-w-sm"
                />
              </div>

              {editError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  {editSuccess}
                </div>
              )}

              <Button
                type="submit"
                disabled={editLoading}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
