import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authApi, type User as UserType } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { useToast } from "@/components/ui/toast-provider";
import { useLocale } from "@/lib/i18n";

function trustColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function riskBadge(category: string) {
  const colors: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    ultra_high: "bg-red-200 text-red-800",
  };
  return colors[category] ?? "bg-neutral-100 text-neutral-700";
}

export default function Profile() {
  const { t, locale, changeLocale } = useLocale();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
  });

  const [nafathId, setNafathId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const cachedUser = user ?? getCurrentUser();

  async function handleNafathVerify() {
    if (!nafathId.trim()) return;
    setVerifying(true);
    try {
      await authApi.nafathVerify(nafathId);
      addToast({
        title: t("toast.profileUpdated"),
        description: locale === "ar" ? "تم بدء التحقق بنفاذ" : "Nafath verification initiated",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      addToast({
        title: t("common.error"),
        description: err.message,
        variant: "error",
      });
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading && !cachedUser) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">{t("common.loading")}</div>
      </div>
    );
  }

  if (!cachedUser) return null;

  const u = cachedUser;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("profile.title")}</h1>
          <p className="text-neutral-500 mt-1">
            {t("profile.memberSince")}:{" "}
            {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => changeLocale(locale === "en" ? "ar" : "en")}
        >
          <Globe className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
          {locale === "en" ? "العربية" : "English"}
        </Button>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-neutral-950" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{u.fullName}</h2>
                <p className="text-sm text-neutral-500">{u.email}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {t(`role.${u.role}` as any)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">{t("profile.trustScore")}</span>
                <span className={`font-bold text-lg ${trustColor(u.trustScore)}`}>
                  {u.trustScore}/100
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">{t("profile.riskCategory")}</span>
                <Badge className={riskBadge(u.riskCategory)}>
                  {u.riskCategory.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                <span className="text-sm text-neutral-600">{t("profile.kycStatus")}</span>
                <Badge
                  variant={u.kycStatus === "verified" ? "default" : "outline"}
                  className={
                    u.kycStatus === "verified"
                      ? "bg-emerald-100 text-emerald-700"
                      : u.kycStatus === "rejected"
                        ? "bg-red-100 text-red-700"
                        : ""
                  }
                >
                  {u.kycStatus}
                </Badge>
              </div>
              {u.phoneE164 && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-sm text-neutral-600">
                    {locale === "ar" ? "الهاتف" : "Phone"}
                  </span>
                  <span className="text-sm font-medium" dir="ltr">
                    {u.phoneE164}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                {t("profile.nafathStatus")}
              </h3>
              {u.nafathVerified ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-800">{t("profile.verified")}</p>
                    <p className="text-xs text-emerald-600">
                      {locale === "ar"
                        ? "هويتك موثقة عبر نفاذ"
                        : "Your identity is verified via Nafath"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">{t("profile.unverified")}</p>
                      <p className="text-xs text-amber-600">
                        {locale === "ar"
                          ? "التحقق مطلوب لإنشاء الإيجارات"
                          : "Verification required for creating rentals"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={
                        locale === "ar"
                          ? "رقم الهوية الوطنية / الإقامة"
                          : "National ID / Iqama number"
                      }
                      value={nafathId}
                      onChange={(e) => setNafathId(e.target.value)}
                      dir="ltr"
                    />
                    <Button
                      onClick={handleNafathVerify}
                      disabled={verifying || !nafathId.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    >
                      {verifying
                        ? t("common.loading")
                        : t("profile.startVerification")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                {t("profile.security")}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {locale === "ar" ? "المصادقة الثنائية" : "Two-factor Auth"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {locale === "ar"
                        ? "عبر تطبيق نفاذ"
                        : "Via Nafath app"}
                    </p>
                  </div>
                  <Badge
                    className={
                      u.nafathVerified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-neutral-100 text-neutral-500"
                    }
                  >
                    {u.nafathVerified
                      ? locale === "ar"
                        ? "مفعّل"
                        : "Enabled"
                      : locale === "ar"
                        ? "غير مفعّل"
                        : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {locale === "ar" ? "حالة الحساب" : "Account Status"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {locale === "ar" ? "حالتك الحالية" : "Your current status"}
                    </p>
                  </div>
                  {u.isBlocked ? (
                    <Badge className="bg-red-100 text-red-700">
                      <XCircle className="w-3 h-3 mr-1" />
                      {locale === "ar" ? "محظور" : "Blocked"}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {locale === "ar" ? "نشط" : "Active"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
