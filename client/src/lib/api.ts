const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

function getToken() {
  return localStorage.getItem("auth_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
};

// ── Stores ────────────────────────────────────────────────────────────────────

export const storesApi = {
  list: () => request<Store[]>("/stores"),
  get: (id: number) => request<Store>(`/stores/${id}`),
  create: (data: Partial<Store>) =>
    request<Store>("/stores", { method: "POST", body: JSON.stringify(data) }),
};

// ── Recipes ───────────────────────────────────────────────────────────────────

export const recipesApi = {
  list: () => request<Recipe[]>("/recipes"),
  get: (id: number) => request<Recipe>(`/recipes/${id}`),
  create: (data: Partial<Recipe> & { specJson?: RecipeSpec }) =>
    request<Recipe>("/recipes", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Recipe> & { specJson?: RecipeSpec }) =>
    request<Recipe>(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ success: boolean }>(`/recipes/${id}`, { method: "DELETE" }),
};

// ── Videos ────────────────────────────────────────────────────────────────────

export const videosApi = {
  list: (params?: { storeId?: number; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.storeId) qs.set("storeId", String(params.storeId));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return request<VideoUpload[]>(`/videos?${qs}`);
  },
  upload: (file: File, storeId: number, recipeId?: number) => {
    const form = new FormData();
    form.append("video", file);
    form.append("storeId", String(storeId));
    if (recipeId) form.append("recipeId", String(recipeId));
    return request<VideoUpload>("/videos/upload", { method: "POST", body: form });
  },
  startAnalysis: (id: number) =>
    request<{ jobId: string; videoId: number; status: string }>(`/videos/${id}/start-analysis`, {
      method: "POST",
    }),
  getStatus: (id: number) => request<VideoStatus>(`/videos/${id}/status`),
  getResults: (id: number) => request<VideoResults>(`/videos/${id}/results`),
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: (params?: {
    storeId?: number;
    videoId?: number;
    provider?: string;
    status?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.storeId) qs.set("storeId", String(params.storeId));
    if (params?.videoId) qs.set("videoId", String(params.videoId));
    if (params?.provider) qs.set("provider", params.provider);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<Alert[]>(`/alerts?${qs}`);
  },
  updateStatus: (id: number, status: string) =>
    request<Alert>(`/alerts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getStats: () => request<AlertStats>("/alerts/stats"),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getKPIs: () => request<DashboardKPIs>("/dashboard/kpis"),
  getCharts: () => request<DashboardCharts>("/dashboard/charts"),
  getReport: (period: "daily" | "weekly" | "monthly") =>
    request<DashboardReport>(`/dashboard/reports?period=${period}`),
};

export const healthApi = {
  check: () => request<HealthCheck>("/health"),
};

// ── Employees ─────────────────────────────────────────────────────────────────

export const employeesApi = {
  list: (params?: { storeId?: number; status?: string; shift?: string }) => {
    const qs = new URLSearchParams();
    if (params?.storeId) qs.set("storeId", String(params.storeId));
    if (params?.status) qs.set("status", params.status);
    if (params?.shift) qs.set("shift", params.shift);
    return request<Employee[]>(`/employees?${qs}`);
  },
  get: (id: number) => request<EmployeeDetail>(`/employees/${id}`),
  create: (data: Partial<Employee>) =>
    request<Employee>("/employees", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Employee>) =>
    request<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ success: boolean }>(`/employees/${id}`, { method: "DELETE" }),
  stats: () => request<EmployeeStats>("/employees/stats"),
  leaderboard: () => request<EmployeeLeaderboardEntry[]>("/employees/leaderboard/top"),
  addPerformance: (id: number, data: Partial<EmployeePerformance>) =>
    request<EmployeePerformance>(`/employees/${id}/performance`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Heatmap ───────────────────────────────────────────────────────────────────

export const heatmapApi = {
  get: () => request<HeatmapResponse>("/heatmap"),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Store {
  id: number;
  name: string;
  type: string;
  city: string;
  cameras: number;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  createdAt: string;
}

export interface Employee {
  id: number;
  storeId: number;
  name: string;
  role: string;
  shift: string;
  phone: string | null;
  email: string | null;
  hireDate: string;
  status: "active" | "on_leave" | "terminated";
  notes: string | null;
  createdAt: string;
  storeName?: string;
}

export interface EmployeePerformance {
  id: number;
  employeeId: number;
  videoId: number | null;
  complianceScore: number | null;
  safetyScore: number | null;
  hygieneScore: number | null;
  violations: number;
  notes: string | null;
  createdAt: string;
}

export interface EmployeeDetail extends Employee {
  performance: EmployeePerformance[];
  summary: {
    evaluations: number;
    avgComplianceScore: number | null;
    totalViolations: number;
  };
}

export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
  avgComplianceScore: number | null;
  totalViolations: number;
  byShift: { morning: number; evening: number; night: number };
}

export interface EmployeeLeaderboardEntry {
  employeeId: number;
  name: string;
  role: string;
  storeName: string;
  avgScore: number;
  evaluations: number;
  violations: number;
}

export interface HeatmapPoint {
  storeId: number;
  name: string;
  type: string;
  city: string;
  address: string | null;
  latitude: number;
  longitude: number;
  hasExactCoords: boolean;
  cameras: number;
  videoCount: number;
  alerts: { total: number; open: number; high: number; critical: number };
  compliance: { avgScore: number | null; samples: number };
  risk: "low" | "medium" | "high" | "critical";
}

export interface HeatmapCity {
  city: string;
  stores: number;
  videos: number;
  openAlerts: number;
  criticalAlerts: number;
  avgScore: number | null;
  lat?: number;
  lng?: number;
}

export interface HeatmapResponse {
  points: HeatmapPoint[];
  cities: HeatmapCity[];
  summary: {
    totalStores: number;
    criticalStores: number;
    highRiskStores: number;
    citiesCovered: number;
  };
}

export interface RecipeSpec {
  requiredIngredients?: string[];
  assemblyOrder?: string[];
  portionConstraints?: Record<string, { min: number; max: number; unit: string }>;
  presentationRules?: string[];
  foodSafetyRules?: string[];
  complianceThreshold?: number;
}

export interface Recipe {
  id: number;
  storeId: number | null;
  name: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  specId?: number;
  specJson?: RecipeSpec;
  spec?: { id: number; specJson: RecipeSpec };
}

export interface VideoUpload {
  id: number;
  storeId: number;
  recipeId: number | null;
  filename: string;
  originalName: string;
  durationSec: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  storeName?: string;
  recipeName?: string;
}

export interface VideoStatus {
  id: number;
  status: string;
  errorMessage: string | null;
  durationSec: number | null;
  framesExtracted: number;
}

export interface ComplianceResult {
  id: number;
  videoId: number;
  recipeId: number;
  provider: "gemini" | "gpt_frames";
  scoreTotal: number;
  ingredientPresenceScore: number | null;
  assemblyOrderScore: number | null;
  portionScore: number | null;
  presentationScore: number | null;
  safetyScore: number | null;
  reasonsJson: string[] | null;
  createdAt: string;
}

export interface VideoResults {
  video: VideoUpload & { storeName?: string; recipeName?: string };
  frames: number;
  gemini: {
    id: number;
    model: string;
    normalizedJson: Record<string, unknown>;
    summaryText: string | null;
    status: string;
    error: string | null;
  } | null;
  gpt: {
    framesAnalyzed: number;
    analyses: Array<{
      id: number;
      frameId: number | null;
      normalizedJson: Record<string, unknown> | null;
      status: string;
      error: string | null;
    }>;
  };
  compliance: ComplianceResult[];
  agreementPct: number | null;
  missingProviders: {
    gemini: boolean;
    openai: boolean;
  };
}

export interface Alert {
  id: number;
  storeId: number;
  videoId: number | null;
  provider: string | null;
  severity: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
  storeName?: string;
}

export interface AlertStats {
  total: number;
  open: number;
  critical: number;
  high: number;
  byProvider: { gemini: number; gpt_frames: number };
}

export interface DashboardKPIs {
  stores: number;
  totalVideos: number;
  openAlerts: number;
  criticalAlerts: number;
  avgComplianceScore: number | null;
  recentVideos: VideoUpload[];
}

export interface DashboardCharts {
  videosByDay: Array<{ date: string; count: number }>;
  alertsByDay: Array<{ date: string; count: number; severity: string }>;
  complianceByProvider: Array<{ provider: string; avgScore: number; count: number }>;
  storeActivity: Array<{ storeId: number; storeName: string; videoCount: number }>;
}

export interface DashboardReport {
  period: string;
  since: string;
  summary: {
    totalVideos: number;
    doneVideos: number;
    errorVideos: number;
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    avgComplianceScore: number;
    complianceChecks: number;
  };
  videos: VideoUpload[];
  alerts: Alert[];
  compliance: ComplianceResult[];
}

export interface HealthCheck {
  ok: boolean;
  version: string;
  providers: { gemini: boolean; openai: boolean };
  timestamp: string;
}
