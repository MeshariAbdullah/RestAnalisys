import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User } from "@/lib/api";

function kycBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Unverified</Badge>;
  }
}

function trustBadge(score: number) {
  if (score >= 80)
    return <Badge className="bg-green-100 text-green-700">Low Risk ({score})</Badge>;
  if (score >= 60)
    return <Badge className="bg-amber-100 text-amber-700">Medium Risk ({score})</Badge>;
  if (score >= 25)
    return <Badge className="bg-orange-100 text-orange-700">High Risk ({score})</Badge>;
  return <Badge className="bg-red-100 text-red-700">Ultra High ({score})</Badge>;
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [nationalId, setNationalId] = useState("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  const nafathMut = useMutation({
    mutationFn: (nid: string) => authApi.nafathVerify(nid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-neutral-500">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-red-500">Failed to load profile</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-neutral-500">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Account Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Role</span>
                <Badge variant="outline">{user.role.replace("_", " ")}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">KYC Status</span>
                {kycBadge(user.kycStatus)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">Trust Score</span>
                {trustBadge(user.trustScore)}
              </div>
              {user.isBlocked && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Account is blocked
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Verification Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4" />
                  Nafath (National ID)
                </div>
                {user.nafathVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-neutral-300" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4" />
                  Phone
                </div>
                {(user as any).phoneVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-neutral-300" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
                {(user as any).emailVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-neutral-300" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!user.nafathVerified && (
        <Card className="border-amber-200">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Verify your identity with Nafath
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              Identity verification is required to rent luxury items. Enter your
              National ID (Iqama) to start the Nafath verification process.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="nationalId">National ID</Label>
                <Input
                  id="nationalId"
                  placeholder="10-digit National ID"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  maxLength={10}
                />
              </div>
              <Button
                className="mt-6 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => nafathMut.mutate(nationalId)}
                disabled={nationalId.length !== 10 || nafathMut.isPending}
              >
                {nafathMut.isPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
            {nafathMut.isSuccess && (
              <p className="text-sm text-green-600 mt-2">
                Verification successful! Your identity has been confirmed.
              </p>
            )}
            {nafathMut.isError && (
              <p className="text-sm text-red-600 mt-2">
                Verification failed. Please check your National ID and try again.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
