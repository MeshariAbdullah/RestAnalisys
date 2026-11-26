import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Calendar,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { authApi, type User } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

function roleBadgeColor(role: string): string {
  switch (role) {
    case "super_admin":
      return "bg-purple-100 text-purple-800";
    case "admin":
      return "bg-blue-100 text-blue-800";
    case "inspector":
      return "bg-teal-100 text-teal-800";
    case "operations":
      return "bg-orange-100 text-orange-800";
    case "owner":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-green-100 text-green-800";
  }
}

function roleLabel(role: string): string {
  return (
    {
      renter: "Renter",
      owner: "Asset Owner",
      inspector: "Inspector",
      operations: "Operations",
      admin: "Admin",
      super_admin: "Super Admin",
    }[role] ?? role
  );
}

function riskColor(cat: string): string {
  switch (cat) {
    case "low":
      return "bg-green-100 text-green-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "ultra_high":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function kycLabel(status: string): string {
  return (
    {
      unverified: "Unverified",
      pending: "Pending Review",
      verified: "Verified",
      rejected: "Rejected",
    }[status] ?? status
  );
}

function kycColor(status: string): string {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function maskNationalId(id?: string | null): string {
  if (!id) return "Not provided";
  if (id.length <= 4) return id;
  return "******" + id.slice(-4);
}

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nafathId, setNafathId] = useState("");
  const [showNafath, setShowNafath] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: { fullName?: string; phoneE164?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setSuccessMsg("Profile updated successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const nafathMutation = useMutation({
    mutationFn: (nationalId: string) => authApi.nafathVerify(nationalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setShowNafath(false);
      setNafathId("");
      setSuccessMsg("Identity verified successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const changes: { fullName?: string; phoneE164?: string } = {};
    if (fullName !== user?.fullName) changes.fullName = fullName;
    if (phone !== (user?.phoneE164 ?? "")) changes.phoneE164 = phone || undefined;
    if (Object.keys(changes).length > 0) {
      updateMutation.mutate(changes);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) return null;

  const hasChanges =
    fullName !== user.fullName || phone !== (user.phoneE164 ?? "");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage your account information
        </p>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {updateMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {(updateMutation.error as Error).message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Identity card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="w-7 h-7 text-neutral-950" />
              </div>
              <div>
                <p className="text-lg font-semibold">{user.fullName}</p>
                <Badge className={roleBadgeColor(user.role)}>
                  {roleLabel(user.role)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">
                  {user.phoneE164 || "Not provided"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-600">
                  {maskNationalId(user.nationalId)}
                </span>
              </div>
              {user.createdAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-600">
                    Member since{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-SA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust & verification card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide">
              Trust & Verification
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {user.nafathVerified ? (
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-neutral-400" />
                  )}
                  <span>Nafath Identity</span>
                </div>
                <Badge
                  className={
                    user.nafathVerified
                      ? "bg-green-100 text-green-700"
                      : "bg-neutral-100 text-neutral-500"
                  }
                >
                  {user.nafathVerified ? "Verified" : "Not Verified"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">KYC Status</span>
                <Badge className={kycColor(user.kycStatus)}>
                  {kycLabel(user.kycStatus)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Category</span>
                <Badge className={riskColor(user.riskCategory)}>
                  {user.riskCategory.replace("_", " ")}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-neutral-400" />
                    <span>Trust Score</span>
                  </div>
                  <span className="font-semibold">{user.trustScore}/100</span>
                </div>
                <Progress value={user.trustScore} className="h-2" />
              </div>
            </div>

            {!user.nafathVerified && (
              <div className="pt-2">
                {showNafath ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      nafathMutation.mutate(nafathId);
                    }}
                    className="space-y-2"
                  >
                    <Label htmlFor="nafath-id">National ID</Label>
                    <Input
                      id="nafath-id"
                      placeholder="e.g. 1012345678"
                      value={nafathId}
                      onChange={(e) => setNafathId(e.target.value)}
                    />
                    {nafathMutation.isError && (
                      <p className="text-xs text-red-600">
                        {(nafathMutation.error as Error).message}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!nafathId || nafathMutation.isPending}
                      >
                        {nafathMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 mr-1" />
                        )}
                        Verify
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNafath(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNafath(true)}
                    className="w-full"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Verify with Nafath
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-4">
            Edit Profile
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Saudi)</Label>
                <Input
                  id="phone"
                  placeholder="+9665XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-ro">Email</Label>
              <Input
                id="email-ro"
                value={user.email}
                disabled
                className="bg-neutral-50"
              />
              <p className="text-xs text-neutral-400">
                Email cannot be changed
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!hasChanges || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
