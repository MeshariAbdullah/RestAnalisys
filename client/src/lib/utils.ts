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

export function getAssetStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_approval: "بانتظار الموافقة",
    rejected: "مرفوض",
    awaiting_shipment: "بانتظار الشحن",
    in_inspection: "قيد الفحص",
    inspection_reported: "تقرير الفحص جاهز",
    owner_rejected_valuation: "المالك رفض التقييم",
    ready_for_listing: "جاهز للعرض",
    listed: "معروض",
    reserved: "محجوز",
    rented_out: "مؤجّر",
    returned_under_inspection: "مرتجع قيد الفحص",
    completed: "مكتمل",
    withdrawn: "مسحوب",
    lost_or_destroyed: "مفقود أو تالف",
  };
  return labels[status] ?? status;
}

export function getRentalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_risk_review: "مراجعة المخاطر",
    pending_legal_signing: "بانتظار التوقيع",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    out_for_delivery: "قيد التوصيل",
    active: "نشط",
    return_in_transit: "مرتجع في الطريق",
    under_inspection: "قيد الفحص",
    closed: "مغلق",
    closed_with_penalty: "مغلق مع غرامة",
    in_dispute: "قيد النزاع",
    enforcement: "قيد التنفيذ",
    cancelled: "ملغي",
  };
  return labels[status] ?? status;
}

export function getRiskCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    low: "منخفض",
    medium: "متوسط",
    high: "مرتفع",
    ultra_high: "مرتفع جداً",
  };
  return labels[category] ?? category;
}
