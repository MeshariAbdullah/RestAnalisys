import React from "react";
import {
  User,
  Shield,
  Mail,
  Phone,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import type { User as UserType } from "@/lib/api";
import Layout from "@/components/Layout";

function roleLabelFull(role: UserType["role"]): string {
  return {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  }[role];
}

function kycBadge(status: UserType["kycStatus"]) {
  const map: Record<UserType["kycStatus"], { label: string; variant: "success" | "warning" | "error" | "secondary" }> = {
    verified: { label: "Verified", variant: "success" },
    pending: { label: "Pending", variant: "warning" },
    rejected: { label: "Rejected", variant: "error" },
    unverified: { label: "Unverified", variant: "secondary" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function riskBadge(category: UserType["riskCategory"]) {
  const map: Record<UserType["riskCategory"], { label: string; variant: "success" | "warning" | "error" | "destructive" }> = {
    low: { label: "Low", variant: "success" },
    medium: { label: "Medium", variant: "warning" },
    high: { label: "High", variant: "error" },
    ultra_high: { label: "Ultra High", variant: "destructive" },
  };
  const { label, variant } = map[category];
  return <Badge variant={variant}>{label}</Badge>;
}

function trustScoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

export default function Profile() {
  const user = getCurrentUser();

  if (!user) {
    return (
      <Layout>
        <div className="p-8 text-center text-neutral-500">
          Unable to load profile. Please log in again.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-neutral-500 mb-8">
          Your account information and verification status.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-amber-500" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500">Full Name</p>
                <p className="font-medium">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Role</p>
                <p className="font-medium">{roleLabelFull(user.role)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">User ID</p>
                <p className="font-mono text-sm text-neutral-600">#{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Account Status</p>
                {user.isBlocked ? (
                  <Badge variant="error">Blocked</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-amber-500" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium">{user.phoneE164 || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">National ID</p>
                  <p className="font-medium">{user.nationalId || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-amber-500" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Nafath Verification</span>
                {user.nafathVerified ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Not Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">KYC Status</span>
                {kycBadge(user.kycStatus)}
              </div>
            </CardContent>
          </Card>

          {/* Trust & Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-amber-500" />
                Trust & Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">Trust Score</span>
                  <span className="text-sm font-semibold">{user.trustScore}/100</span>
                </div>
                <Progress
                  value={user.trustScore}
                  className="h-3"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  {user.trustScore >= 70
                    ? "Your trust score is in good standing."
                    : user.trustScore >= 40
                      ? "Your trust score needs improvement."
                      : "Your trust score is low. Some features may be restricted."}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Risk Category</span>
                {riskBadge(user.riskCategory)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
