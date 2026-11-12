import React from "react";
import { Link } from "wouter";
import {
  User as UserIcon,
  Mail,
  Phone,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function maskNationalId(id: string | undefined | null): string {
  if (!id) return "Not provided";
  if (id.length <= 4) return id;
  return "*".repeat(id.length - 4) + id.slice(-4);
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  };
  return labels[role] ?? role;
}

function riskCategoryColor(category: string): string {
  switch (category) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "ultra_high":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function riskCategoryLabel(category: string): string {
  switch (category) {
    case "low":
      return "Low Risk";
    case "medium":
      return "Medium Risk";
    case "high":
      return "High Risk";
    case "ultra_high":
      return "Ultra High Risk";
    default:
      return category;
  }
}

function trustScoreColor(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
}

function kycStatusBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge variant="success">Verified</Badge>;
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "rejected":
      return <Badge variant="error">Rejected</Badge>;
    default:
      return <Badge variant="outline">Unverified</Badge>;
  }
}

function VerificationItem({
  label,
  verified,
  icon: Icon,
}: {
  label: string;
  verified: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-neutral-500" />
        <span className="text-sm text-neutral-700">{label}</span>
      </div>
      {verified ? (
        <div className="flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-medium">Verified</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-neutral-400">
          <XCircle className="w-4 h-4" />
          <span className="text-xs font-medium">Not verified</span>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const user = getCurrentUser();

  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
          <UserIcon className="w-7 h-7 text-neutral-950" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{user.fullName}</h1>
          <p className="text-sm text-neutral-500">{roleLabel(user.role)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Email</p>
                <p className="text-sm font-medium text-neutral-800">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Phone</p>
                <p className="text-sm font-medium text-neutral-800">
                  {user.phoneE164 ?? "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">National ID</p>
                <p className="text-sm font-medium text-neutral-800 font-mono">
                  {maskNationalId(user.nationalId)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Role</p>
                <p className="text-sm font-medium text-neutral-800">
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verification Status</CardTitle>
            <CardDescription>Identity and compliance checks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <VerificationItem
                label="Nafath Identity"
                verified={user.nafathVerified}
                icon={ShieldCheck}
              />
              <VerificationItem
                label="KYC Check"
                verified={user.kycStatus === "verified"}
                icon={Shield}
              />
              <VerificationItem
                label="Phone Number"
                verified={!!user.phoneE164}
                icon={Phone}
              />
              <VerificationItem
                label="Email Address"
                verified={!!user.email}
                icon={Mail}
              />
            </div>

            {/* KYC Status Detail */}
            <div className="mt-4 flex items-center justify-between bg-neutral-50 rounded-lg p-3">
              <span className="text-sm text-neutral-600">KYC Status</span>
              {kycStatusBadge(user.kycStatus)}
            </div>

            {/* Nafath CTA */}
            {!user.nafathVerified && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      Identity not verified
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5 mb-3">
                      Verify your national identity through Nafath to unlock all platform features.
                    </p>
                    <Link href="/verify">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Verify Now
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust Score */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Trust Score</CardTitle>
                <CardDescription>
                  Your platform trust rating based on verification and activity
                </CardDescription>
              </div>
              <Badge className={cn("text-sm", riskCategoryColor(user.riskCategory))}>
                {riskCategoryLabel(user.riskCategory)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-4xl font-bold text-neutral-900">
                  {Math.round(user.trustScore)}
                </span>
                <span className="text-sm text-neutral-500 mb-1">out of 100</span>
              </div>
              <div className="relative">
                <Progress
                  value={user.trustScore}
                  className="h-3"
                />
                <div
                  className={cn(
                    "absolute top-0 left-0 h-3 rounded-full transition-all",
                    trustScoreColor(user.trustScore)
                  )}
                  style={{ width: `${Math.min(user.trustScore, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-neutral-50 rounded-lg p-3 text-center">
                <p className="text-xs text-neutral-500">Score</p>
                <p className="text-lg font-semibold text-neutral-800">
                  {Math.round(user.trustScore)}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 text-center">
                <p className="text-xs text-neutral-500">Risk Category</p>
                <p className="text-lg font-semibold text-neutral-800 capitalize">
                  {user.riskCategory.replace("_", " ")}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 text-center">
                <p className="text-xs text-neutral-500">Nafath</p>
                <p className="text-lg font-semibold text-neutral-800">
                  {user.nafathVerified ? "Yes" : "No"}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 text-center">
                <p className="text-xs text-neutral-500">KYC</p>
                <p className="text-lg font-semibold text-neutral-800 capitalize">
                  {user.kycStatus}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
