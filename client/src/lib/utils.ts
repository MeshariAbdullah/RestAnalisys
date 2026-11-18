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

export function getRentalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_risk_review: "Pending Review",
    pending_legal_signing: "Awaiting Signature",
    pending_payment: "Awaiting Payment",
    confirmed: "Confirmed",
    out_for_delivery: "Out for Delivery",
    active: "Active",
    return_in_transit: "Return in Transit",
    under_inspection: "Under Inspection",
    closed: "Closed",
    closed_with_penalty: "Closed (Penalty)",
    in_dispute: "In Dispute",
    enforcement: "Enforcement",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getAssetStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_approval: "Pending Approval",
    rejected: "Rejected",
    awaiting_shipment: "Awaiting Shipment",
    in_inspection: "In Inspection",
    inspection_reported: "Inspection Reported",
    owner_rejected_valuation: "Valuation Rejected",
    ready_for_listing: "Ready to List",
    listed: "Listed",
    reserved: "Reserved",
    rented_out: "Rented Out",
    returned_under_inspection: "Return Inspection",
    completed: "Completed",
    withdrawn: "Withdrawn",
    lost_or_destroyed: "Lost/Destroyed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getRentalStatusColor(status: string): string {
  switch (status) {
    case "confirmed":
    case "active":
      return "bg-green-100 text-green-700";
    case "closed":
      return "bg-blue-100 text-blue-700";
    case "pending_risk_review":
    case "pending_legal_signing":
    case "pending_payment":
      return "bg-yellow-100 text-yellow-700";
    case "cancelled":
      return "bg-neutral-100 text-neutral-700";
    case "in_dispute":
    case "enforcement":
    case "closed_with_penalty":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-SA");
}
