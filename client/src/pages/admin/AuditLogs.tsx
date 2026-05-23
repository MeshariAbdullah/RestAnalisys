import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { adminApi } from "@/lib/api";

interface AuditLogEntry {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  beforeJson: unknown;
  afterJson: unknown;
  ip: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ENTITY_TYPES = ["", "user", "asset", "rental", "payment", "dispute", "sanad"];

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("submit") || action.includes("approve")) return "bg-green-100 text-green-800";
  if (action.includes("reject") || action.includes("block") || action.includes("cancel")) return "bg-red-100 text-red-800";
  if (action.includes("close") || action.includes("discharge")) return "bg-blue-100 text-blue-800";
  if (action.includes("enforce") || action.includes("execute")) return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-800";
}

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityType],
    queryFn: () => adminApi.auditLogs({ page, action: actionFilter, entityType }),
  });

  const logs = data as AuditLogResponse | undefined;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Logs</h1>
        <p className="text-neutral-500 mb-6">Immutable record of all system actions.</p>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Filter by action (e.g. rental.create, asset.approve)..."
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="text-sm border rounded-md px-3 py-2 bg-white"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : !logs || logs.items.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">No audit logs match your filters.</div>
        ) : (
          <>
            <div className="text-sm text-neutral-500 mb-3">{logs.total} entries total</div>
            <div className="space-y-2">
              {logs.items.map((entry) => (
                <Card
                  key={entry.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge className={actionColor(entry.action)}>{entry.action}</Badge>
                        <span className="text-sm text-neutral-600">
                          {entry.entityType}
                          {entry.entityId ? ` #${entry.entityId}` : ""}
                        </span>
                        {entry.actorRole && (
                          <Badge variant="outline" className="text-xs">{entry.actorRole}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        {entry.ip && <span>{entry.ip}</span>}
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {expandedId === entry.id && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entry.beforeJson != null && (
                          <div>
                            <p className="text-xs font-medium text-neutral-500 mb-1">Before</p>
                            <pre className="text-xs bg-red-50 p-3 rounded overflow-auto max-h-40">
                              {JSON.stringify(entry.beforeJson, null, 2)}
                            </pre>
                          </div>
                        )}
                        {entry.afterJson != null && (
                          <div>
                            <p className="text-xs font-medium text-neutral-500 mb-1">After</p>
                            <pre className="text-xs bg-green-50 p-3 rounded overflow-auto max-h-40">
                              {JSON.stringify(entry.afterJson, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="md:col-span-2 text-xs text-neutral-400">
                          Actor: User #{entry.actorUserId ?? "system"} | Log ID: {entry.id}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {logs.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-neutral-600">
                  Page {page} of {logs.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= logs.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
