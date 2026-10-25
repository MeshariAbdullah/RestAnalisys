import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, type AuditLog } from "@/lib/api";

const ENTITY_TYPES = [
  "all",
  "user",
  "asset",
  "rental",
  "payment",
  "legal_commitment",
  "sanad_record",
  "payout",
  "dispute",
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("register") || action.includes("submit"))
    return "bg-emerald-100 text-emerald-800";
  if (action.includes("delete") || action.includes("block") || action.includes("reject"))
    return "bg-red-100 text-red-800";
  if (action.includes("approve") || action.includes("sign") || action.includes("verified"))
    return "bg-blue-100 text-blue-800";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityType === "all" ? undefined : entityType,
        limit: 100,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-6 h-6 text-neutral-400" />
        <h1 className="text-3xl font-bold">Audit Logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-neutral-500">Filter by entity:</span>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All entities" : t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-neutral-400">
          {logs?.length ?? 0} entries
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          No audit logs found.
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[2fr_1fr_2fr_1.5fr_1fr] gap-3 px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
            <span>Time</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Entity</span>
            <span>IP</span>
          </div>

          {logs.map((log) => {
            const expanded = expandedId === log.id;
            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedId(expanded ? null : log.id)}
                  className="w-full grid grid-cols-[2fr_1fr_2fr_1.5fr_1fr] gap-3 px-4 py-3 rounded-lg hover:bg-neutral-50 transition-colors text-left items-center text-sm"
                >
                  <span className="text-neutral-600 flex items-center gap-1.5">
                    {expanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {formatTime(log.createdAt)}
                  </span>
                  <span className="text-neutral-700">
                    {log.actorRole ? (
                      <Badge variant="outline" className="text-xs">
                        {log.actorRole}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">system</span>
                    )}
                  </span>
                  <span>
                    <Badge className={actionColor(log.action) + " text-xs font-normal"}>
                      {log.action}
                    </Badge>
                  </span>
                  <span className="text-neutral-600">
                    {log.entityType}
                    {log.entityId != null && (
                      <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                    )}
                  </span>
                  <span className="text-neutral-400 text-xs truncate">
                    {log.ip ?? "—"}
                  </span>
                </button>

                {expanded && (
                  <Card className="ml-8 mb-2">
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-neutral-500 mb-1">
                          Before
                        </p>
                        <pre className="text-xs bg-neutral-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                          {log.beforeJson
                            ? JSON.stringify(log.beforeJson, null, 2)
                            : "—"}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500 mb-1">
                          After
                        </p>
                        <pre className="text-xs bg-neutral-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                          {log.afterJson
                            ? JSON.stringify(log.afterJson, null, 2)
                            : "—"}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
