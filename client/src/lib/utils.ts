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
    approved: "موافق عليه",
    in_inspection: "قيد الفحص",
    in_vault: "في المستودع",
    ready_for_listing: "جاهز للعرض",
    listed: "معروض",
    reserved: "محجوز",
    rented_out: "مؤجر",
    under_return_inspection: "قيد فحص الإرجاع",
    returned_clean: "مرجع بحالة سليمة",
    returned_damaged: "مرجع بأضرار",
    withdrawn: "مسحوب",
    lost_or_destroyed: "مفقود أو تالف",
    rejected: "مرفوض",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getRentalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_risk_review: "مراجعة المخاطر",
    risk_approved: "موافق عليه",
    pending_signature: "بانتظار التوقيع",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    out_for_delivery: "قيد التوصيل",
    active: "نشط",
    under_inspection: "قيد الفحص",
    closed_clean: "مغلق - سليم",
    closed_penalty: "مغلق - غرامة",
    closed_major_damage: "مغلق - أضرار جسيمة",
    closed_loss: "مغلق - فقدان",
    in_dispute: "متنازع عليه",
    enforcement: "تنفيذ قضائي",
    cancelled: "ملغي",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
