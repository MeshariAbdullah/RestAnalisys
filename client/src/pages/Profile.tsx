import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  Clock,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { authApi, formatSar, type UserProfile } from "@/lib/api";

function trustScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function trustScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Low";
}

function riskBadgeColor(category: string): string {
  switch (category) {
    case "low":
      return "bg-green-100 text-green-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "ultra_high":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-200 text-neutral-700";
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  };
  return map[role] ?? role;
}

function VerificationBadge({
  verified,
  label,
  icon: Icon,
}: {
  verified: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        verified
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-neutral-50 border-neutral-200 text-neutral-400"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
      {verified ? (
        <CheckCircle className="w-4 h-4 ml-auto" />
      ) : (
        <XCircle className="w-4 h-4 ml-auto" />
      )}
    </div>
  );
}

export default function Profile() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.profile(),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
        Unable to load profile.
      </div>
    );
  }

  const stats = profile.rentalStats;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-neutral-500 mt-1">Account details and verification status</p>
      </header>

      {/* User Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-8 h-8 text-neutral-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{profile.fullName}</h2>
              <p className="text-neutral-500">{profile.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-neutral-100 text-neutral-700 border-0">
                  {roleLabel(profile.role)}
                </Badge>
                <Badge className={`border-0 ${riskBadgeColor(profile.riskCategory)}`}>
                  {profile.riskCategory.replace(/_/g, " ")} risk
                </Badge>
                {profile.isBlocked && (
                  <Badge className="bg-red-100 text-red-700 border-0">Blocked</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t">
            {profile.phoneE164 && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Phone className="w-4 h-4 text-neutral-400" />
                {profile.phoneE164}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Calendar className="w-4 h-4 text-neutral-400" />
              Joined {profile.accountAgeDays} days ago
            </div>
            {profile.lastLoginAt && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Clock className="w-4 h-4 text-neutral-400" />
                Last login {new Date(profile.lastLoginAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trust Score */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-neutral-500" />
            <h3 className="font-semibold text-lg">Trust Score</h3>
          </div>
          <div className="flex items-end gap-4 mb-3">
            <span className="text-4xl font-bold">{profile.trustScore}</span>
            <span className="text-neutral-500 pb-1">/ 100</span>
            <Badge className={`ml-auto border-0 text-white ${trustScoreColor(profile.trustScore)}`}>
              {trustScoreLabel(profile.trustScore)}
            </Badge>
          </div>
          <div className="relative h-3 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${trustScoreColor(profile.trustScore)}`}
              style={{ width: `${profile.trustScore}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Score determines rental eligibility and legal commitment percentage
          </p>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-neutral-500" />
            <h3 className="font-semibold text-lg">Verification Status</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <VerificationBadge
              verified={profile.nafathVerified}
              label="Nafath ID"
              icon={Shield}
            />
            <VerificationBadge
              verified={profile.kycStatus === "verified"}
              label={`KYC (${profile.kycStatus})`}
              icon={ShieldCheck}
            />
            <VerificationBadge
              verified={profile.phoneVerified ?? false}
              label="Phone"
              icon={Phone}
            />
            <VerificationBadge
              verified={profile.emailVerified ?? false}
              label="Email"
              icon={Mail}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rental Statistics */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-neutral-500" />
            <h3 className="font-semibold text-lg">Rental Statistics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold">{stats.totalRentals}</p>
              <p className="text-xs text-neutral-500 mt-1">Total Rentals</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{stats.completedRentals}</p>
              <p className="text-xs text-neutral-500 mt-1">Completed</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{stats.activeRentals}</p>
              <p className="text-xs text-neutral-500 mt-1">Active</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <p className="text-2xl font-bold text-neutral-600">{stats.cancelledRentals}</p>
              <p className="text-xs text-neutral-500 mt-1">Cancelled</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.disputedRentals}</p>
              <p className="text-xs text-neutral-500 mt-1">Disputed</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Banknote className="w-4 h-4 text-amber-600" />
                <p className="text-lg font-bold text-amber-700">
                  {formatSar(stats.totalSpentHalalas)}
                </p>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Total Spent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
