import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";
import type { User } from "@/lib/api";

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

function kycLabel(status: User["kycStatus"]): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (status) {
    case "verified":
      return { text: "Verified", variant: "default" };
    case "pending":
      return { text: "Pending", variant: "secondary" };
    case "rejected":
      return { text: "Rejected", variant: "destructive" };
    default:
      return { text: "Unverified", variant: "outline" };
  }
}

function riskColor(category: string): string {
  switch (category) {
    case "low": return "text-green-600 bg-green-50";
    case "medium": return "text-yellow-600 bg-yellow-50";
    case "high": return "text-orange-600 bg-orange-50";
    case "ultra_high": return "text-red-600 bg-red-50";
    default: return "text-neutral-600 bg-neutral-50";
  }
}

export default function Profile() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-neutral-500">Loading profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-red-500">Failed to load profile.</p>
      </div>
    );
  }

  const kyc = kycLabel(user.kycStatus);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Account details and verification status.</p>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <UserCircle className="w-8 h-8 text-neutral-950" />
            </div>
            <div>
              <CardTitle className="text-xl">{user.fullName}</CardTitle>
              <Badge variant="secondary" className="mt-1">{roleLabel(user.role)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-600">Email</span>
            <span className="ml-auto font-medium">{user.email}</span>
          </div>
          {user.phoneE164 && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-600">Phone</span>
              <span className="ml-auto font-medium">{user.phoneE164}</span>
            </div>
          )}
          {user.nationalId && (
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-600">National ID</span>
              <span className="ml-auto font-medium">{user.nationalId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            {user.nafathVerified ? (
              <ShieldCheck className="w-4 h-4 text-green-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-neutral-400" />
            )}
            <span className="text-neutral-600">Nafath Identity</span>
            <Badge variant={user.nafathVerified ? "default" : "outline"} className="ml-auto">
              {user.nafathVerified ? "Verified" : "Not Verified"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ShieldCheck className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-600">KYC Status</span>
            <Badge variant={kyc.variant} className="ml-auto">{kyc.text}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trust & Risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <TrendingUp className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-600">Trust Score</span>
            <span className="ml-auto font-bold text-lg">{user.trustScore}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-600">Risk Category</span>
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${riskColor(user.riskCategory)}`}>
              {user.riskCategory.replace("_", " ")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
