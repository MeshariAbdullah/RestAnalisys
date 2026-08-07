import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface AuditEntry {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  ipAddress?: string;
  userAgent?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
  userName?: string;
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

async function fetchAuditLogs(params: {
  entityType?: string;
  action?: string;
  limit: number;
}): Promise<AuditEntry[]> {
  const qs = new URLSearchParams();
  if (params.entityType) qs.set("entityType", params.entityType);
  if (params.action) qs.set("action", params.action);
  qs.set("limit", String(params.limit));

  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/admin/audit-logs?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

function actionColor(action: string) {
  if (action.includes("reject") || action.includes("block") || action.includes("execute"))
    return "bg-red-100 text-red-800";
  if (action.includes("approve") || action.includes("sign") || action.includes("discharge"))
    return "bg-green-100 text-green-800";
  if (action.includes("submit") || action.includes("create") || action.includes("open"))
    return "bg-blue-100 text-blue-800";
  return "bg-neutral-100 text-neutral-700";
}

const ENTITY_TYPES = ["", "asset", "rental", "inspection", "dispute", "sanad", "payment", "user"];

export default function AuditLog() {
  const [entityType, setEntityType] = useState("");
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, limit],
    queryFn: () => fetchAuditLogs({ entityType: entityType || undefined, limit }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-purple-500" />
        <h1 className="text-3xl font-bold">Audit Log</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of all material actions across the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-neutral-400" />
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white"
        >
          <option value={25}>25 entries</option>
          <option value={50}>50 entries</option>
          <option value={100}>100 entries</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-neutral-500 text-sm">Loading audit entries…</p>
      ) : !logs || logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            <ScrollText className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p>No audit entries found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <Card key={entry.id} className="hover:shadow transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge className={actionColor(entry.action)}>
                      {entry.action}
                    </Badge>
                    <Badge className="bg-neutral-100 text-neutral-600 text-xs">
                      {entry.entityType} #{entry.entityId}
                    </Badge>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span>User #{entry.userId}{entry.userName ? ` (${entry.userName})` : ""}</span>
                  {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                </div>
                {(entry.before || entry.after) && (
                  <details className="mt-2">
                    <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
                      Show changes
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs font-mono bg-neutral-50 rounded p-3 max-h-40 overflow-auto">
                      {entry.before && (
                        <div>
                          <p className="text-red-500 font-medium mb-1">Before</p>
                          <pre className="whitespace-pre-wrap text-neutral-600">
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.after && (
                        <div>
                          <p className="text-green-500 font-medium mb-1">After</p>
                          <pre className="whitespace-pre-wrap text-neutral-600">
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
