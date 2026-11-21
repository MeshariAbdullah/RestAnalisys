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
    in_inspection: "قيد الفحص",
    inspection_reported: "تم التقييم",
    owner_rejected_valuation: "المالك رفض التقييم",
    ready_for_listing: "جاهز للعرض",
    listed: "معروض",
    reserved: "محجوز",
    rented_out: "مؤجر",
    returned_under_inspection: "مرتجع قيد الفحص",
    completed: "مكتمل",
    withdrawn: "مسحوب",
    lost_or_destroyed: "مفقود أو تالف",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getStatusColor(status: string) {
  switch (status) {
    case "listed":
    case "completed":
      return "bg-green-100 text-green-800";
    case "rented_out":
    case "active":
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "reserved":
    case "pending_approval":
    case "in_inspection":
    case "inspection_reported":
    case "awaiting_shipment":
    case "ready_for_listing":
    case "returned_under_inspection":
      return "bg-yellow-100 text-yellow-800";
    case "rejected":
    case "owner_rejected_valuation":
    case "lost_or_destroyed":
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "withdrawn":
      return "bg-neutral-100 text-neutral-800";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}
