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

export function getRentalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_risk_review: "Risk Review",
    pending_legal_signing: "Awaiting Signature",
    pending_payment: "Awaiting Payment",
    confirmed: "Confirmed",
    out_for_delivery: "Out for Delivery",
    active: "Active",
    return_in_transit: "Returning",
    under_inspection: "Under Inspection",
    closed: "Closed",
    closed_with_penalty: "Closed (Penalty)",
    in_dispute: "In Dispute",
    enforcement: "Enforcement",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getAssetStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_approval: "Pending Approval",
    rejected: "Rejected",
    awaiting_shipment: "Awaiting Shipment",
    in_inspection: "In Inspection",
    inspection_reported: "Valuation Ready",
    owner_rejected_valuation: "Valuation Rejected",
    ready_for_listing: "Ready to List",
    listed: "Listed",
    reserved: "Reserved",
    rented_out: "Rented Out",
    returned_under_inspection: "Return Inspection",
    completed: "Completed",
    withdrawn: "Withdrawn",
    lost_or_destroyed: "Lost / Destroyed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
