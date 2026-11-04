import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, type AuditLog } from "@/lib/api";
import Layout from "@/components/Layout";

const ENTITY_TYPES = ["user", "asset", "rental", "payment", "dispute", "sanad", "shipment", "payout"];

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const limit = 30;

  const { data: actions } = useQuery({
    queryKey: ["audit-log-actions"],
    queryFn: () => adminApi.auditLogActions(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityTypeFilter],
    queryFn: () =>
      adminApi.auditLogs({
        page,
        limit,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-7 h-7 text-amber-600" />
          <h1 className="text-3xl font-bold">Audit Logs</h1>
        </div>
        <p className="text-neutral-500 mb-6">
          Immutable record of every material action on the platform.
        </p>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-neutral-400" />

              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="">All actions</option>
                {(actions ?? []).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <select
                value={entityTypeFilter}
                onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
                className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="">All entities</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <span className="text-xs text-neutral-400 ml-auto">
                {total} entries
              </span>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-neutral-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p>No audit log entries match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[140px_1fr_100px_80px_40px] gap-3 px-4 py-2 text-xs font-medium text-neutral-500 uppercase">
              <span>Timestamp</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Actor</span>
              <span></span>
            </div>
            {items.map((log: AuditLog) => (
              <div key={log.id}>
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full grid grid-cols-[140px_1fr_100px_80px_40px] gap-3 px-4 py-3 text-sm items-center rounded-lg hover:bg-neutral-50 text-left"
                >
                  <span className="text-xs text-neutral-500 font-mono">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-medium truncate">{log.action}</span>
                  <Badge variant="outline" className="text-xs w-fit">
                    {log.entityType}
                    {log.entityId != null ? ` #${log.entityId}` : ""}
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {log.actorRole ?? "system"}
                    {log.actorUserId ? ` #${log.actorUserId}` : ""}
                  </span>
                  {expanded === log.id ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </button>

                {expanded === log.id && (
                  <div className="mx-4 mb-2 p-4 rounded-lg bg-neutral-50 border border-neutral-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-neutral-500 mb-1">Before</p>
                        <pre className="text-xs bg-white p-2 rounded border border-neutral-200 overflow-auto max-h-48">
                          {log.beforeJson
                            ? JSON.stringify(log.beforeJson, null, 2)
                            : "(none)"}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500 mb-1">After</p>
                        <pre className="text-xs bg-white p-2 rounded border border-neutral-200 overflow-auto max-h-48">
                          {log.afterJson
                            ? JSON.stringify(log.afterJson, null, 2)
                            : "(none)"}
                        </pre>
                      </div>
                    </div>
                    {log.ip && (
                      <p className="text-[10px] text-neutral-400 mt-2">IP: {log.ip}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
