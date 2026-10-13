import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Filter, User, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, type AuditLogEntry } from "@/lib/api";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "dispute", "sanad", "shipment"];

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter],
    queryFn: () =>
      adminApi.auditLogs(entityFilter === "all" ? undefined : entityFilter),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-neutral-400" />
        <div className="flex gap-1 flex-wrap">
          {ENTITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setEntityFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                entityFilter === t
                  ? "bg-amber-500 text-neutral-950"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-400 text-sm">Loading audit logs…</p>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No audit log entries found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const ts = new Date(entry.createdAt);

  return (
    <Card
      className="cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
              <User className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="font-semibold">{entry.action}</span>
                {entry.entityType && (
                  <span className="text-neutral-400">
                    {" "}
                    on {entry.entityType}
                    {entry.entityId != null && ` #${entry.entityId}`}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {ts.toLocaleDateString()} {ts.toLocaleTimeString()}
                </span>
                {entry.actorRole && (
                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[11px]">
                    {entry.actorRole}
                  </span>
                )}
                {entry.ip && (
                  <span className="text-neutral-300">{entry.ip}</span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs text-neutral-300 shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {expanded && (entry.beforeJson || entry.afterJson) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.beforeJson && (
              <div>
                <p className="text-[11px] text-neutral-400 font-medium mb-1 uppercase tracking-wider">
                  Before
                </p>
                <pre className="text-xs bg-neutral-50 rounded p-3 overflow-auto max-h-48 text-neutral-600">
                  {JSON.stringify(entry.beforeJson, null, 2)}
                </pre>
              </div>
            )}
            {entry.afterJson && (
              <div>
                <p className="text-[11px] text-neutral-400 font-medium mb-1 uppercase tracking-wider">
                  After
                </p>
                <pre className="text-xs bg-neutral-50 rounded p-3 overflow-auto max-h-48 text-neutral-600">
                  {JSON.stringify(entry.afterJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
