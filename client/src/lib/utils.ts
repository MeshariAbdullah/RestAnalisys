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
    // Rental statuses
    pending_risk_review: "مراجعة المخاطر",
    pending_legal_signing: "بانتظار التوقيع",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    out_for_delivery: "قيد التوصيل",
    active: "نشط",
    return_in_transit: "إرجاع قيد النقل",
    under_inspection: "تحت الفحص",
    closed: "مغلق",
    closed_with_penalty: "مغلق (غرامة)",
    in_dispute: "نزاع",
    enforcement: "تنفيذ",
    cancelled: "ملغي",
    // Asset statuses
    pending_approval: "بانتظار الموافقة",
    rejected: "مرفوض",
    awaiting_shipment: "بانتظار الشحن",
    in_inspection: "قيد الفحص",
    inspection_reported: "تم إعداد تقرير الفحص",
    owner_rejected_valuation: "المالك رفض التقييم",
    ready_for_listing: "جاهز للعرض",
    listed: "معروض",
    reserved: "محجوز",
    rented_out: "مؤجّر",
    returned_under_inspection: "مرتجع تحت الفحص",
    completed: "مكتمل",
    withdrawn: "مسحوب",
    lost_or_destroyed: "مفقود أو تالف",
    // Legacy
    uploaded: "تم الرفع",
    done: "مكتمل",
    error: "خطأ",
    queued: "في الانتظار",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "done": return "✅";
    case "error": return "❌";
    case "uploaded": return "📤";
    case "extracting_frames": return "🎞️";
    case "analyzing_gpt": return "🤖";
    case "analyzing_gemini": return "💎";
    case "saving_results": return "💾";
    default: return "⏳";
  }
}
