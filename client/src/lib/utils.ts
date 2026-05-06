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
    in_inspection: "قيد الفحص",
    awaiting_owner_approval: "بانتظار موافقة المالك",
    in_vault: "في المستودع",
    listed: "معروض",
    rented_out: "مؤجر",
    withdrawn: "مسحوب",
    rejected: "مرفوض",
    pending_legal_signing: "بانتظار التوقيع",
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    delivered: "تم التسليم",
    returned: "تم الإرجاع",
    closed: "مغلق",
    closed_clean: "مغلق بنجاح",
    closed_with_penalty: "مغلق مع غرامة",
    cancelled: "ملغي",
    disputed: "متنازع عليه",
    open: "مفتوح",
    resolved: "محلول",
    active: "نشط",
    blocked: "محظور",
    verified: "موثق",
    unverified: "غير موثق",
  };
  return labels[status] ?? status;
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "listed":
    case "confirmed":
    case "delivered":
    case "closed_clean":
    case "verified":
    case "active":
      return "✅";
    case "rejected":
    case "cancelled":
    case "blocked":
      return "❌";
    case "pending_approval":
    case "pending_payment":
    case "pending_legal_signing":
      return "⏳";
    case "in_inspection":
    case "in_vault":
      return "🔍";
    case "rented_out":
      return "📦";
    case "disputed":
      return "⚠️";
    default:
      return "📋";
  }
}
