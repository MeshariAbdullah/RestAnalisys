import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Diamond,
  Receipt,
  Gavel,
  FileSignature,
  AlertOctagon,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, formatSar } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";

export default function AdminDashboard() {
  const { t, locale } = useI18n();
  const user = getCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => adminApi.kpis(),
  });

  const labels = locale === "ar" ? {
    users: "المستخدمين",
    listedAssets: "أصول مدرجة",
    rentedAssets: "أصول مؤجرة",
    rentalsThisMonth: "إيجارات هذا الشهر",
    grossRevenue: "إجمالي إيرادات الإيجار",
    platformFees: "رسوم المنصة",
    vatCollected: "ضريبة القيمة المضافة",
    openDisputes: "نزاعات مفتوحة",
    activeSanads: "سندات نشطة",
    sanadsExecution: "سندات تحت التنفيذ",
    overview: "نظرة عامة على الإدارة",
    subtitle: "مقاييس المنصة وطوابير الإشراف",
  } : {
    users: "Users",
    listedAssets: "Listed assets",
    rentedAssets: "Rented assets",
    rentalsThisMonth: "Rentals this month",
    grossRevenue: "Gross rental revenue",
    platformFees: "Platform fees",
    vatCollected: "VAT collected",
    openDisputes: "Open disputes",
    activeSanads: "Active Sanads",
    sanadsExecution: "Sanads under execution",
    overview: "Admin overview",
    subtitle: "Platform-wide metrics and moderation queues",
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">
        {t("dashboard.welcome", { name: user?.fullName ?? "" })}
      </h1>
      <p className="text-neutral-500 mb-8">{labels.subtitle}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi icon={Users} label={labels.users} value={isLoading ? "…" : data?.users ?? 0} />
        <Kpi icon={Diamond} label={labels.listedAssets} value={isLoading ? "…" : data?.listedAssets ?? 0} />
        <Kpi icon={TrendingUp} label={labels.rentedAssets} value={isLoading ? "…" : data?.rentedAssets ?? 0} />
        <Kpi icon={Receipt} label={labels.rentalsThisMonth} value={isLoading ? "…" : data?.rentalsThisMonth ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">{labels.grossRevenue}</p>
            <p className="text-3xl font-bold">
              {isLoading ? "…" : formatSar(data?.revenue.rentalSubtotalHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">{labels.platformFees}</p>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? "…" : formatSar(data?.revenue.platformFeeHalalas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-neutral-500 mb-1">{labels.vatCollected}</p>
            <p className="text-3xl font-bold">
              {isLoading ? "…" : formatSar(data?.revenue.vatHalalas)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/disputes">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Gavel className="w-8 h-8 text-red-500 mb-3" />
                <p className="text-sm text-neutral-500">{labels.openDisputes}</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.openDisputes ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <FileSignature className="w-8 h-8 text-amber-500 mb-3" />
                <p className="text-sm text-neutral-500">{labels.activeSanads}</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.activeSanads ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
        <Link href="/admin/sanad">
          <a>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <AlertOctagon className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-sm text-neutral-500">{labels.sanadsExecution}</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "…" : data?.sanadsUnderExecution ?? 0}
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
