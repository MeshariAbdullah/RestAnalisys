import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatScore(score: number) {
  return `${Math.round(score)}%`;
}

export function getScoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-600";
  return "text-red-600";
}

export function getScoreBg(score: number) {
  if (score >= 85) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-yellow-100 text-yellow-800";
  if (score >= 50) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "text-red-600 bg-red-100";
    case "high": return "text-orange-600 bg-orange-100";
    case "medium": return "text-yellow-600 bg-yellow-100";
    case "low": return "text-blue-600 bg-blue-100";
    default: return "text-gray-600 bg-gray-100";
  }
}

export function getSeverityLabel(severity: string) {
  switch (severity) {
    case "critical": return "حرج";
    case "high": return "مرتفع";
    case "medium": return "متوسط";
    case "low": return "منخفض";
    default: return severity;
  }
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "مسودة",
    pending_approval: "بانتظار الموافقة",
    approved: "معتمد",
    rejected: "مرفوض",
    in_inspection: "قيد الفحص",
    inspection_reported: "تقرير الفحص",
    in_vault: "في الخزنة",
    listed: "معروض",
    rented: "مؤجر",
    returned_pending_inspection: "مرتجع بانتظار الفحص",
    flagged: "مُبلّغ",
    withdrawn: "مسحوب",
    archived: "مؤرشف",
    lost: "مفقود",
    pending_risk_review: "مراجعة المخاطر",
    pending_legal: "بانتظار التوثيق",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    in_fulfillment: "قيد التجهيز",
    out_for_delivery: "قيد التوصيل",
    delivered: "تم التسليم",
    in_use: "قيد الاستخدام",
    awaiting_return: "بانتظار الإرجاع",
    returned: "مرتجع",
    closed_clean: "مغلق",
    closed_penalty: "مغلق بغرامة",
    closed_loss: "مغلق بخسارة",
    cancelled: "ملغي",
    open: "مفتوح",
    assigned: "معيّن",
    investigating: "قيد التحقيق",
    mediation: "وساطة",
    resolved_renter_favour: "لصالح المستأجر",
    resolved_platform_favour: "لصالح المنصة",
    resolved_owner_favour: "لصالح المالك",
    escalated_legal: "تصعيد قانوني",
    scheduled: "مجدول",
    picked_up: "تم الاستلام",
    in_transit: "في الطريق",
    failed: "فشل",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
