/**
 * Typed API client for the Managed Luxury Rental Platform.
 *
 * Every call uses the JWT stored in localStorage under `auth_token`. On 401
 * we clear the token so `ProtectedRoute` redirects to /login.
 */

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }

  if (!res.ok) {
    let err: { error?: string; code?: string; details?: unknown } = {};
    try {
      err = await res.json();
    } catch {
      /* ignore */
    }
    const e = new Error(err.error ?? res.statusText) as Error & {
      code?: string;
      details?: unknown;
      status?: number;
    };
    e.code = err.code;
    e.details = err.details;
    e.status = res.status;
    throw e;
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Role =
  | "renter"
  | "owner"
  | "inspector"
  | "operations"
  | "admin"
  | "super_admin";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  phoneE164?: string;
  nationalId?: string;
  nafathVerified: boolean;
  kycStatus: "unverified" | "pending" | "verified" | "rejected";
  trustScore: number;
  riskCategory: "low" | "medium" | "high" | "ultra_high";
  isBlocked?: boolean;
}

export interface Asset {
  id: number;
  ownerId: number;
  category: string;
  brand: string;
  model?: string;
  title: string;
  description?: string;
  ownerDeclaredValueHalalas?: number;
  evaluatedValueHalalas?: number;
  dailyRentalPriceHalalas?: number;
  riskCategory: string;
  status: string;
  submissionImagesJson: string[];
  studioImagesJson: string[];
  attributesJson: Record<string, unknown>;
  warehouseLocationCode?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rental {
  id: number;
  reference: string;
  assetId: number;
  renterId: number;
  ownerId: number;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  dailyPriceHalalas: number;
  rentalSubtotalHalalas: number;
  platformFeeHalalas: number;
  vatHalalas: number;
  totalPayableHalalas: number;
  trustScoreAtBooking?: number;
  legalCommitmentPct: number;
  legalCommitmentHalalas: number;
  riskSnapshotJson?: Record<string, unknown>;
  confirmedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  closedAt?: string;
  createdAt: string;
}

export interface LegalCommitment {
  id: number;
  rentalId: number;
  status: string;
  contractVersion: string;
  commitmentHalalas: number;
  commitmentPct: number;
  clausesJson: Array<{
    id: string;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
  }>;
  signedAt?: string;
}

export interface SanadRecord {
  id: number;
  rentalId: number;
  status: string;
  nafithReference?: string;
  principalHalalas: number;
  dueHalalas: number;
  maturityDate: string;
  executionCaseNumber?: string;
}

export interface Payment {
  id: number;
  rentalId?: number;
  type: string;
  status: string;
  amountHalalas: number;
  gateway: string;
  gatewayTransactionId?: string;
  invoiceNumber?: string;
  invoiceQrBase64?: string;
  capturedAt?: string;
  createdAt: string;
}

export interface Inspection {
  id: number;
  assetId: number;
  inspectorId: number;
  type: "intake" | "return" | "audit";
  rentalId?: number;
  authenticityVerified: boolean;
  conditionScore?: number;
  conditionGrade?: string;
  marketValueHalalas?: number;
  recommendedDailyPriceHalalas?: number;
  riskCategory: string;
  beforeImagesJson: string[];
  afterImagesJson: string[];
  ownerApproved: boolean;
}

export interface Dispute {
  id: number;
  rentalId: number;
  openedByUserId: number;
  status: string;
  category: string;
  severity: string;
  summary: string;
  evidenceJson: string[];
  resolutionNotes?: string;
  resolutionAmountHalalas?: number;
  openedAt: string;
  resolvedAt?: string;
}

export interface Shipment {
  id: number;
  assetId: number;
  rentalId?: number;
  direction: string;
  status: string;
  courier?: string;
  trackingNumber?: string;
  scheduledAt?: string;
  deliveredAt?: string;
}

export interface RentalQuote {
  assetId: number;
  assetTitle: string;
  evaluatedValueHalalas: number;
  dailyPriceHalalas: number;
  durationDays: number;
  rentalSubtotalHalalas: number;
  platformFeeHalalas: number;
  vatHalalas: number;
  totalPayableHalalas: number;
}

export interface AdminKPIs {
  users: number;
  listedAssets: number;
  rentedAssets: number;
  rentalsThisMonth: number;
  revenue: {
    rentalSubtotalHalalas: number;
    platformFeeHalalas: number;
    vatHalalas: number;
  };
  openDisputes: number;
  activeSanads: number;
  sanadsUnderExecution: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, fullName: string, role: "renter" | "owner" = "renter") =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName, role }),
    }),
  me: () => request<User>("/auth/me"),
  nafathVerify: (nationalId: string) =>
    request<{ transactionId: string; status: string }>("/auth/nafath/initiate", {
      method: "POST",
      body: JSON.stringify({ nationalId }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Assets
// ─────────────────────────────────────────────────────────────────────────────

export const assetsApi = {
  listings: (params?: { category?: string; brand?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.brand) qs.set("brand", params.brand);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ items: Asset[]; count: number }>(`/assets/listings?${qs}`);
  },
  listingDetail: (id: number) => request<Asset>(`/assets/listings/${id}`),
  mine: () => request<Asset[]>("/assets/mine"),
  submit: (data: {
    category: string;
    brand: string;
    model?: string;
    title: string;
    description?: string;
    ownerDeclaredValueHalalas: number;
    submissionImages: string[];
    attributes?: Record<string, unknown>;
  }) =>
    request<Asset>("/assets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pending: () => request<Asset[]>("/assets/pending"),
  review: (assetId: number, approved: boolean, rejectionReason?: string) =>
    request<Asset>("/assets/review", {
      method: "POST",
      body: JSON.stringify({ assetId, approved, rejectionReason }),
    }),
  publish: (id: number) =>
    request<Asset>(`/assets/${id}/publish`, { method: "POST" }),
  valuationResponse: (id: number, approved: boolean, rejectionReason?: string) =>
    request<Asset>(`/assets/${id}/valuation-response`, {
      method: "POST",
      body: JSON.stringify({ approved, rejectionReason }),
    }),
  received: (id: number, warehouseLocationCode: string) =>
    request<Asset>(`/assets/${id}/received`, {
      method: "POST",
      body: JSON.stringify({ warehouseLocationCode }),
    }),
  get: (id: number) => request<Asset>(`/assets/${id}`),
  withdraw: (id: number) =>
    request<Asset>(`/assets/${id}/withdraw`, { method: "POST" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Inspections
// ─────────────────────────────────────────────────────────────────────────────

export const inspectionsApi = {
  queue: () => request<Asset[]>("/inspections/queue"),
  createIntake: (data: {
    assetId: number;
    authenticityVerified: boolean;
    authenticityNotes?: string;
    conditionScore: number;
    conditionGrade: "A" | "B" | "C" | "D";
    conditionNotes?: string;
    marketValueHalalas: number;
    recommendedDailyPriceHalalas: number;
    riskCategory: "low" | "medium" | "high" | "ultra_high";
    beforeImages?: string[];
    afterImages?: string[];
    checklist?: Record<string, unknown>;
  }) =>
    request<Inspection>("/inspections/intake", {
      method: "POST",
      body: JSON.stringify({ ...data, type: "intake" }),
    }),
  createReturn: (data: {
    assetId: number;
    rentalId: number;
    authenticityVerified: boolean;
    conditionScore: number;
    conditionGrade: "A" | "B" | "C" | "D";
    conditionNotes?: string;
    marketValueHalalas: number;
    recommendedDailyPriceHalalas: number;
    riskCategory: "low" | "medium" | "high" | "ultra_high";
    beforeImages?: string[];
    afterImages?: string[];
    checklist?: Record<string, unknown>;
  }) =>
    request<{ inspection: Inspection; hint: string }>("/inspections/return", {
      method: "POST",
      body: JSON.stringify({ ...data, type: "return" }),
    }),
  forAsset: (assetId: number) =>
    request<Inspection[]>(`/inspections/asset/${assetId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Rentals
// ─────────────────────────────────────────────────────────────────────────────

export const rentalsApi = {
  quote: (assetId: number, startDate: string, endDate: string) => {
    const qs = new URLSearchParams({
      assetId: String(assetId),
      startDate,
      endDate,
    });
    return request<RentalQuote>(`/rentals/quote?${qs}`);
  },
  create: (data: {
    assetId: number;
    startDate: string;
    endDate: string;
    deliveryAddress?: Record<string, unknown>;
  }) =>
    request<{
      rental: Rental;
      risk: Record<string, unknown>;
      legal: {
        commitmentId: number;
        status: string;
        clauses: LegalCommitment["clausesJson"];
        textHash: string;
        commitmentHalalas: number;
        commitmentPct: number;
      };
      quote: RentalQuote;
    }>("/rentals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  mine: () => request<Rental[]>("/rentals/mine"),
  list: () => request<Rental[]>("/rentals"),
  get: (id: number) =>
    request<{
      rental: Rental;
      legal: LegalCommitment | null;
      sanad: SanadRecord | null;
      payments: Payment[];
    }>(`/rentals/${id}`),
  cancel: (id: number, reason: string) =>
    request<Rental>(`/rentals/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  fulfill: (id: number) =>
    request<Rental>(`/rentals/${id}/fulfill`, { method: "POST" }),
  delivered: (id: number) =>
    request<Rental>(`/rentals/${id}/delivered`, { method: "POST" }),
  returned: (id: number) =>
    request<Rental>(`/rentals/${id}/returned`, { method: "POST" }),
  close: (
    id: number,
    outcome: "clean" | "penalty" | "major_damage" | "loss",
    penaltyHalalas?: number
  ) =>
    request<Rental>(`/rentals/${id}/close`, {
      method: "POST",
      body: JSON.stringify({ outcome, penaltyHalalas }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Legal + Sanad
// ─────────────────────────────────────────────────────────────────────────────

export const legalApi = {
  commitment: (id: number) =>
    request<{ commitment: LegalCommitment; rental: Rental; asset: Asset }>(
      `/legal/commitment/${id}`
    ),
  sign: (legalCommitmentId: number) =>
    request<{ commitment: LegalCommitment; sanad: SanadRecord }>("/legal/sign", {
      method: "POST",
      body: JSON.stringify({ legalCommitmentId, acceptTerms: true }),
    }),
  sanads: () => request<SanadRecord[]>("/legal/sanads"),
  pendingEnforcement: () =>
    request<SanadRecord[]>("/legal/pending-enforcement"),
  dischargeSanad: (id: number) =>
    request<SanadRecord>(`/legal/sanad/${id}/discharge`, { method: "POST" }),
  executeSanad: (sanadId: number, reason: string, attachments: string[] = []) =>
    request<SanadRecord>("/legal/sanad/execute", {
      method: "POST",
      body: JSON.stringify({ sanadId, reason, attachments }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsApi = {
  charge: (rentalId: number) =>
    request<{ payment: Payment; invoice: { invoiceNumber: string } }>("/payments/charge", {
      method: "POST",
      body: JSON.stringify({ rentalId }),
    }),
  refund: (paymentId: number, amountHalalas?: number, reason?: string) =>
    request<Payment>("/payments/refund", {
      method: "POST",
      body: JSON.stringify({ paymentId, amountHalalas, reason }),
    }),
  mine: () => request<Payment[]>("/payments/mine"),
  releasePayout: (rentalId: number) =>
    request<{ id: number; netHalalas: number }>(`/payments/payout/${rentalId}`, {
      method: "POST",
    }),
  myPayouts: () =>
    request<Array<{ id: number; netHalalas: number; status: string; createdAt: string }>>(
      "/payments/payouts/mine"
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

export const disputesApi = {
  open: (data: {
    rentalId: number;
    category: "damage" | "loss" | "fraud" | "service" | "billing";
    summary: string;
    evidence?: string[];
  }) =>
    request<Dispute>("/disputes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  list: () => request<Dispute[]>("/disputes"),
  assign: (id: number, assigneeUserId: number) =>
    request<Dispute>(`/disputes/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ assigneeUserId }),
    }),
  resolve: (data: {
    disputeId: number;
    resolution:
      | "resolved_for_renter"
      | "resolved_for_platform"
      | "resolved_for_owner"
      | "escalated_to_legal";
    notes: string;
    resolutionAmountHalalas?: number;
  }) =>
    request<Dispute>("/disputes/resolve", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Operations
// ─────────────────────────────────────────────────────────────────────────────

export const operationsApi = {
  summary: () =>
    request<{
      activeRentals: number;
      lateRentals: number;
      openAlerts: number;
      inventoryCounts: Array<{ status: string; count: number }>;
    }>("/operations/summary"),
  shipments: () => request<Shipment[]>("/operations/shipments"),
  scheduleShipment: (data: {
    assetId: number;
    rentalId?: number;
    direction: string;
    courier?: string;
    scheduledAt?: string;
    fromAddress?: Record<string, unknown>;
    toAddress?: Record<string, unknown>;
  }) =>
    request<Shipment>("/operations/shipments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateShipment: (id: number, data: { status: string; trackingNumber?: string }) =>
    request<Shipment>(`/operations/shipments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  inventory: () =>
    request<Array<{ id: number; title: string; brand: string; status: string }>>(
      "/operations/inventory"
    ),
  alerts: () =>
    request<Array<{ id: number; type: string; severity: string; message: string; status: string; createdAt: string }>>(
      "/operations/alerts"
    ),
  resolveAlert: (id: number) =>
    request(`/operations/alerts/${id}/resolve`, { method: "POST" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

export const adminApi = {
  kpis: () => request<AdminKPIs>("/admin/kpis"),
  revenueTrend: () =>
    request<Array<{ day: string; total_halalas: string; fee_halalas: string; rentals: string }>>(
      "/admin/revenue-trend"
    ),
  lowTrustUsers: () => request<User[]>("/admin/risk/low-trust"),
  users: (role?: string) => {
    const qs = role ? `?role=${role}` : "";
    return request<User[]>(`/admin/users${qs}`);
  },
  blockUser: (id: number, block: boolean, reason?: string) =>
    request<User>(`/admin/users/${id}/block`, {
      method: "POST",
      body: JSON.stringify({ block, reason }),
    }),
  recentRiskDecisions: () =>
    request<Array<Record<string, unknown>>>("/admin/risk/recent"),
  createStaff: (data: {
    email: string;
    fullName: string;
    role: "admin" | "operations" | "inspector";
    password: string;
  }) =>
    request<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  auditLogs: (params?: { limit?: number; offset?: number; entityType?: string; action?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.entityType) qs.set("entityType", params.entityType);
    if (params?.action) qs.set("action", params.action);
    return request<{ items: Array<Record<string, unknown>>; total: number; limit: number; offset: number }>(
      `/admin/audit-logs?${qs}`
    );
  },
  overdueRentals: () => request<Rental[]>("/admin/rentals/overdue"),
};

export const healthApi = {
  check: () => request<{ ok: boolean; service: string; version: string; integrations: Record<string, boolean> }>("/health"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Money helpers (frontend copies of the backend constants)
// ─────────────────────────────────────────────────────────────────────────────

export function halalasToSar(halalas: number | null | undefined): number {
  if (halalas == null) return 0;
  return halalas / 100;
}

export function formatSar(halalas: number | null | undefined): string {
  const value = halalasToSar(halalas);
  return `${value.toLocaleString("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} SAR`;
}
