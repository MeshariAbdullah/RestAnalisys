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

export function formatMoney(halalas: number | undefined | null): string {
  if (halalas == null) return "—";
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(halalas / 100);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    listed: "bg-green-100 text-green-800",
    active: "bg-blue-100 text-blue-800",
    rented_out: "bg-blue-100 text-blue-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    in_inspection: "bg-yellow-100 text-yellow-800",
    inspection_reported: "bg-amber-100 text-amber-800",
    closed: "bg-neutral-100 text-neutral-800",
    cancelled: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800",
    enforcement: "bg-red-100 text-red-800",
    in_dispute: "bg-orange-100 text-orange-800",
    withdrawn: "bg-neutral-100 text-neutral-600",
  };
  return colors[status] ?? "bg-neutral-100 text-neutral-800";
}

export function getRiskColor(category: string): string {
  switch (category) {
    case "low": return "text-green-600";
    case "medium": return "text-yellow-600";
    case "high": return "text-orange-600";
    case "ultra_high": return "text-red-600";
    default: return "text-neutral-600";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-600 bg-red-100";
    case "high": return "text-orange-600 bg-orange-100";
    case "medium": return "text-yellow-600 bg-yellow-100";
    case "low": return "text-blue-600 bg-blue-100";
    default: return "text-gray-600 bg-gray-100";
  }
}
