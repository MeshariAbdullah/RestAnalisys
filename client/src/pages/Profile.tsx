import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  Phone,
  Mail,
  BadgeCheck,
  AlertTriangle,
  Star,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { authApi, type User as UserType } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { getScoreBg } from "@/lib/utils";

function InfoRow({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  badge?: { text: string; className: string };
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <Icon className="w-5 h-5 text-neutral-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-500 uppercase">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
      {badge && (
        <Badge className={`${badge.className} border-0`}>{badge.text}</Badge>
      )}
    </div>
  );
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [nafathOpen, setNafathOpen] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  async function handleNafathVerify() {
    setVerifying(true);
    try {
      const result = await authApi.nafathVerify(nationalId);
      if (result.status === "verified") {
        toast({
          title: "Identity verified",
          description: "Your Nafath verification is complete.",
          variant: "success",
        });
        const cachedUser = getCurrentUser();
        if (cachedUser) {
          saveSession(
            localStorage.getItem("auth_token")!,
            { ...cachedUser, nafathVerified: true, kycStatus: "verified" }
          );
        }
        queryClient.invalidateQueries({ queryKey: ["me"] });
        setNafathOpen(false);
      }
    } catch (err) {
      toast({
        title: "Verification failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!user) return <div className="p-8">Unable to load profile.</div>;

  const roleLabel: Record<string, string> = {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">
        Account details and verification status.
      </p>

      {/* Identity Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-neutral-950" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <Badge className="bg-neutral-100 text-neutral-700 border-0 mt-1">
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-0">
            <InfoRow
              icon={Mail}
              label="Email"
              value={user.email}
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={user.phoneE164 ?? "Not provided"}
            />
            <InfoRow
              icon={Shield}
              label="National ID"
              value={user.nationalId ?? "Not linked"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BadgeCheck className="w-5 h-5" /> Verification Status
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Nafath Identity</p>
                <Badge
                  className={`border-0 ${
                    user.nafathVerified
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {user.nafathVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500">
                Saudi Digital Identity verification via the national Nafath
                platform.
              </p>
              {!user.nafathVerified && (
                <Button
                  size="sm"
                  className="mt-3 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  onClick={() => setNafathOpen(true)}
                >
                  Verify Now
                </Button>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">KYC Status</p>
                <Badge
                  className={`border-0 ${
                    user.kycStatus === "verified"
                      ? "bg-green-100 text-green-700"
                      : user.kycStatus === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : user.kycStatus === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {user.kycStatus}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500">
                Know Your Customer compliance check.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust & Risk */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Trust & Risk Profile
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-xs text-neutral-500 uppercase">Trust Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold">{user.trustScore}</span>
                <span className="text-sm text-neutral-500">/ 100</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full ${
                    user.trustScore >= 70
                      ? "bg-green-500"
                      : user.trustScore >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${user.trustScore}%` }}
                />
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-xs text-neutral-500 uppercase">Risk Category</p>
              <div className="mt-1">
                <Badge
                  className={`text-lg px-3 py-1 border-0 ${
                    user.riskCategory === "low"
                      ? "bg-green-100 text-green-700"
                      : user.riskCategory === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : user.riskCategory === "high"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.riskCategory.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                {user.riskCategory === "low"
                  ? "100% asset value commitment on rentals"
                  : "150% asset value commitment on rentals"}
              </p>
            </div>
          </div>

          {user.isBlocked && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Your account is currently blocked. Contact support for assistance.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nafath Dialog */}
      <Dialog open={nafathOpen} onOpenChange={setNafathOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify with Nafath</DialogTitle>
            <DialogDescription>
              Enter your National ID (Iqama or Saudi ID) to verify your identity
              through the Nafath digital identity platform.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>National ID Number</Label>
            <Input
              placeholder="10-digit National ID"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              maxLength={10}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNafathOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNafathVerify}
              disabled={verifying || nationalId.length < 10}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {verifying ? "Verifying..." : "Verify Identity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
