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

export function getRentalStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_risk_review: "bg-amber-100 text-amber-800",
    pending_legal_signing: "bg-blue-100 text-blue-800",
    pending_payment: "bg-purple-100 text-purple-800",
    confirmed: "bg-green-100 text-green-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    active: "bg-green-200 text-green-900",
    return_in_transit: "bg-cyan-100 text-cyan-800",
    under_inspection: "bg-amber-100 text-amber-800",
    closed: "bg-neutral-200 text-neutral-700",
    closed_with_penalty: "bg-orange-100 text-orange-800",
    in_dispute: "bg-red-100 text-red-800",
    enforcement: "bg-red-200 text-red-900",
    cancelled: "bg-neutral-300 text-neutral-600",
  };
  return colors[status] ?? "bg-neutral-200 text-neutral-700";
}

export function getAssetStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_approval: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-700",
    awaiting_shipment: "bg-blue-100 text-blue-800",
    in_inspection: "bg-purple-100 text-purple-800",
    inspection_reported: "bg-amber-100 text-amber-800",
    ready_for_listing: "bg-cyan-100 text-cyan-800",
    listed: "bg-green-100 text-green-800",
    reserved: "bg-amber-200 text-amber-900",
    rented_out: "bg-green-200 text-green-900",
    returned_under_inspection: "bg-purple-100 text-purple-800",
    completed: "bg-neutral-200 text-neutral-700",
    withdrawn: "bg-neutral-300 text-neutral-600",
    lost_or_destroyed: "bg-red-200 text-red-900",
  };
  return colors[status] ?? "bg-neutral-200 text-neutral-700";
}

export function humanizeStatus(status: string): string {
  return status.replace(/_/g, " ");
}
