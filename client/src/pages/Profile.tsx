import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toaster";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Shield,
  Phone,
  CreditCard,
  BadgeCheck,
  AlertTriangle,
  Languages,
  Lock,
  TrendingUp,
  Calendar,
} from "lucide-react";

export default function Profile() {
  const { t, locale, setLocale } = useI18n();
  const { success } = useToast();
  const user = getCurrentUser();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phoneE164 ?? "");

  if (!user) return null;

  const kycColors: Record<string, string> = {
    verified: "text-emerald-400 bg-emerald-400/10",
    pending: "text-amber-400 bg-amber-400/10",
    unverified: "text-neutral-400 bg-neutral-400/10",
    rejected: "text-red-400 bg-red-400/10",
  };

  const riskColors: Record<string, string> = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-orange-400",
    ultra_high: "text-red-400",
  };

  const riskLabels: Record<string, Record<string, string>> = {
    ar: { low: "منخفض", medium: "متوسط", high: "عالي", ultra_high: "عالي جداً" },
    en: { low: "Low", medium: "Medium", high: "High", ultra_high: "Ultra High" },
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t("profile.title")}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {t("profile.memberSince")}: {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
          </p>
        </div>
        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-neutral-950" />
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-amber-500" />
            {t("profile.personalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("auth.fullName")}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("auth.email")}</Label>
              <Input value={user.email} disabled className="mt-1 opacity-60" />
            </div>
            <div>
              <Label>{t("profile.phone")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-neutral-400" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966XXXXXXXXX"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <Label>{t("profile.nationalId")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <Input
                  value={user.nationalId ?? ""}
                  disabled
                  className="opacity-60"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => success(t("toast.profileUpdated"))}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {t("profile.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Verification & Trust */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-amber-500" />
            {t("profile.security")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BadgeCheck className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">{t("profile.nafathStatus")}</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.nafathVerified
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-neutral-500 bg-neutral-100"
                }`}
              >
                {user.nafathVerified ? t("profile.verified") : t("profile.unverified")}
              </span>
              {!user.nafathVerified && (
                <Button
                  size="sm"
                  className="mt-3 w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  {t("profile.verifyNafath")}
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">{t("profile.kycStatus")}</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  kycColors[user.kycStatus] ?? kycColors.unverified
                }`}
              >
                {user.kycStatus}
              </span>
            </div>

            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">{t("profile.trustScore")}</span>
              </div>
              <p className="text-2xl font-bold">{user.trustScore}</p>
            </div>

            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">{t("profile.riskCategory")}</span>
              </div>
              <span className={`text-lg font-bold ${riskColors[user.riskCategory] ?? ""}`}>
                {riskLabels[locale]?.[user.riskCategory] ?? user.riskCategory}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="w-5 h-5 text-amber-500" />
            {t("profile.preferences")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label>{t("profile.language")}:</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setLocale("ar")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locale === "ar"
                    ? "bg-amber-500 text-neutral-950"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {t("profile.arabic")}
              </button>
              <button
                onClick={() => setLocale("en")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locale === "en"
                    ? "bg-amber-500 text-neutral-950"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {t("profile.english")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5 text-amber-500" />
            {t("profile.changePassword")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>{t("profile.currentPassword")}</Label>
              <Input type="password" className="mt-1" />
            </div>
            <div>
              <Label>{t("profile.newPassword")}</Label>
              <Input type="password" className="mt-1" />
            </div>
            <div>
              <Label>{t("profile.confirmPassword")}</Label>
              <Input type="password" className="mt-1" />
            </div>
          </div>
          <Button variant="outline">{t("profile.save")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
