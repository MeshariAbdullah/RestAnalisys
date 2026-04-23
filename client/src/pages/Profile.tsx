import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  BadgeCheck,
  Phone,
  Mail,
  MapPin,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { fullName?: string; phone?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const currentUser = getCurrentUser();
      if (currentUser) {
        saveSession(localStorage.getItem("auth_token") ?? "", {
          ...currentUser,
          fullName: updated.fullName,
        });
      }
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const nafathMutation = useMutation({
    mutationFn: (id: string) => authApi.nafathVerify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
    }
  }, [user]);

  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!user) return <div className="p-8">Unable to load profile.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">
        Manage your account information and verification status.
      </p>

      {success && (
        <div className="mb-6 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4" />
          Profile updated successfully.
        </div>
      )}

      {/* Verification Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Verification Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VerificationItem
              label="Nafath ID"
              verified={user.nafathVerified}
              icon={BadgeCheck}
            />
            <VerificationItem
              label="KYC"
              verified={user.kycStatus === "verified"}
              icon={Shield}
              status={user.kycStatus}
            />
            <VerificationItem
              label="Phone"
              verified={!!user.phoneE164}
              icon={Phone}
            />
            <VerificationItem
              label="Email"
              verified={true}
              icon={Mail}
            />
          </div>

          {!user.nafathVerified && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-neutral-600 mb-3">
                Verify your Saudi National ID via Nafath to unlock rentals and
                legal signing.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="National ID (10 digits)"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={() => nafathMutation.mutate(nationalId)}
                  disabled={nafathMutation.isPending || nationalId.length !== 10}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {nafathMutation.isPending ? "Verifying…" : "Verify via Nafath"}
                </Button>
              </div>
              {nafathMutation.isError && (
                <p className="mt-2 text-sm text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  {(nafathMutation.error as Error).message}
                </p>
              )}
              {nafathMutation.isSuccess && (
                <p className="mt-2 text-sm text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  Identity verified successfully!
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-amber-500" />
              Personal Information
            </h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label>Phone (Saudi format)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9665XXXXXXXX"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      fullName,
                      ...(phone ? { phone } : {}),
                    })
                  }
                  disabled={updateMutation.isPending}
                  className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
              {updateMutation.isError && (
                <p className="text-sm text-red-600">
                  {(updateMutation.error as Error).message}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Full Name" value={user.fullName} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phoneE164 ?? "Not set"} />
              <InfoRow label="National ID" value={user.nationalId ?? "Not linked"} />
              <InfoRow label="Role" value={user.role.replace(/_/g, " ")} />
              <InfoRow
                label="Trust Score"
                value={
                  <span className="flex items-center gap-2">
                    {user.trustScore ?? "N/A"}
                    <Badge
                      className={
                        user.riskCategory === "low"
                          ? "bg-green-100 text-green-700"
                          : user.riskCategory === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {user.riskCategory}
                    </Badge>
                  </span>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow
              label="Member Since"
              value={
                (user as any).createdAt
                  ? new Date((user as any).createdAt).toLocaleDateString("en-SA")
                  : "N/A"
              }
            />
            <InfoRow
              label="Account Status"
              value={
                user.isBlocked ? (
                  <Badge className="bg-red-100 text-red-700">Blocked</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                )
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationItem({
  label,
  verified,
  icon: Icon,
  status,
}: {
  label: string;
  verified: boolean;
  icon: React.ComponentType<{ className?: string }>;
  status?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        verified
          ? "border-green-200 bg-green-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <Icon
        className={`w-6 h-6 mx-auto mb-1.5 ${
          verified ? "text-green-600" : "text-neutral-400"
        }`}
      />
      <p className="text-xs font-medium">{label}</p>
      <p
        className={`text-[11px] ${
          verified ? "text-green-600" : "text-neutral-400"
        }`}
      >
        {verified ? "Verified" : status ?? "Pending"}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-neutral-500 text-xs uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
