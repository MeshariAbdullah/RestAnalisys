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
    pending_approval: "بانتظار الموافقة",
    rejected: "مرفوض",
    awaiting_shipment: "بانتظار الشحن",
    in_inspection: "تحت الفحص",
    inspection_reported: "تم الفحص",
    owner_rejected_valuation: "رفض المالك التقييم",
    ready_for_listing: "جاهز للعرض",
    listed: "معروض",
    reserved: "محجوز",
    rented_out: "مؤجر",
    returned_under_inspection: "مرتجع تحت الفحص",
    completed: "مكتمل",
    withdrawn: "مسحوب",
    lost_or_destroyed: "مفقود أو تالف",
    pending_risk_review: "مراجعة المخاطر",
    pending_legal_signing: "بانتظار التوقيع",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    out_for_delivery: "قيد التوصيل",
    active: "نشط",
    return_in_transit: "مرتجع في الطريق",
    under_inspection: "تحت الفحص",
    closed: "مغلق",
    closed_with_penalty: "مغلق مع غرامة",
    in_dispute: "في نزاع",
    enforcement: "تنفيذ",
    cancelled: "ملغي",
    open: "مفتوح",
    investigating: "قيد التحقيق",
    resolved_for_renter: "تم الحل لصالح المستأجر",
    resolved_for_platform: "تم الحل لصالح المنصة",
    resolved_for_owner: "تم الحل لصالح المالك",
    scheduled: "مجدول",
    picked_up: "تم الاستلام",
    in_transit: "في الطريق",
    delivered: "تم التوصيل",
    failed: "فشل",
    pending: "معلق",
    captured: "تم القبض",
    refunded: "مسترد",
    paid: "مدفوع",
  };
  return labels[status] ?? status;
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "listed":
    case "active":
    case "confirmed":
    case "completed":
    case "closed":
    case "paid":
    case "delivered":
    case "captured":
      return "check_circle";
    case "rejected":
    case "failed":
    case "cancelled":
    case "lost_or_destroyed":
      return "cancel";
    case "pending_approval":
    case "pending_risk_review":
    case "pending_legal_signing":
    case "pending_payment":
    case "pending":
      return "hourglass";
    case "in_inspection":
    case "under_inspection":
    case "returned_under_inspection":
    case "investigating":
      return "search";
    case "in_dispute":
    case "enforcement":
      return "warning";
    case "rented_out":
    case "reserved":
      return "lock";
    case "out_for_delivery":
    case "in_transit":
    case "return_in_transit":
    case "scheduled":
      return "local_shipping";
    default:
      return "info";
  }
}
