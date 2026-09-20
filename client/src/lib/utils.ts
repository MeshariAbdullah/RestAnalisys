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
    // Asset statuses
    pending_approval: "قيد المراجعة",
    rejected: "مرفوض",
    awaiting_shipment: "بانتظار الشحن",
    in_inspection: "قيد الفحص",
    inspection_reported: "تم تقرير الفحص",
    owner_rejected_valuation: "رفض المالك التقييم",
    ready_for_listing: "جاهز للإدراج",
    listed: "مدرج",
    reserved: "محجوز",
    rented_out: "مؤجر",
    returned_under_inspection: "مرتجع قيد الفحص",
    completed: "مكتمل",
    withdrawn: "تم السحب",
    lost_or_destroyed: "مفقود أو تالف",
    // Rental statuses
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
    enforcement: "تنفيذ قضائي",
    cancelled: "ملغي",
    // Payment statuses
    pending: "قيد الانتظار",
    authorized: "مصرح",
    captured: "محصّل",
    failed: "فشل",
    refunded: "مسترد",
    // General
    open: "مفتوح",
    investigating: "قيد التحقيق",
    resolved: "تم الحل",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    listed: "bg-green-100 text-green-800",
    confirmed: "bg-blue-100 text-blue-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    pending_risk_review: "bg-yellow-100 text-yellow-800",
    pending_legal_signing: "bg-yellow-100 text-yellow-800",
    pending_payment: "bg-yellow-100 text-yellow-800",
    pending: "bg-yellow-100 text-yellow-800",
    in_inspection: "bg-purple-100 text-purple-800",
    under_inspection: "bg-purple-100 text-purple-800",
    closed: "bg-neutral-100 text-neutral-600",
    completed: "bg-neutral-100 text-neutral-600",
    cancelled: "bg-neutral-100 text-neutral-600",
    withdrawn: "bg-neutral-100 text-neutral-600",
    rejected: "bg-red-100 text-red-800",
    failed: "bg-red-100 text-red-800",
    enforcement: "bg-red-100 text-red-800",
    in_dispute: "bg-orange-100 text-orange-800",
    closed_with_penalty: "bg-orange-100 text-orange-800",
    rented_out: "bg-blue-100 text-blue-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    captured: "bg-green-100 text-green-800",
    refunded: "bg-amber-100 text-amber-800",
  };
  return colors[status] ?? "bg-neutral-100 text-neutral-600";
}
