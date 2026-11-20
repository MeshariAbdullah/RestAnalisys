import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "dispute", "inspection", "sanad", "shipment"];

function roleColor(role: string | null): string {
  if (!role) return "bg-neutral-100 text-neutral-600";
  if (role === "super_admin" || role === "admin") return "bg-amber-100 text-amber-800";
  if (role === "inspector") return "bg-blue-100 text-blue-700";
  if (role === "operations") return "bg-purple-100 text-purple-700";
  return "bg-neutral-100 text-neutral-600";
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function JsonDiff({ before, after }: { before: unknown; after: unknown }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-1">Before</p>
        <pre className="text-xs bg-neutral-50 rounded-md p-3 overflow-auto max-h-60 border">
          {before ? JSON.stringify(before, null, 2) : "—"}
        </pre>
      </div>
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-1">After</p>
        <pre className="text-xs bg-neutral-50 rounded-md p-3 overflow-auto max-h-60 border">
          {after ? JSON.stringify(after, null, 2) : "—"}
        </pre>
      </div>
    </div>
  );
}

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", page, entityType],
    queryFn: () =>
      adminApi.auditLogs({
        page,
        limit: 30,
        entityType: entityType === "all" ? undefined : entityType,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All entities" : t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-neutral-500 ml-auto">
          {data ? `${data.total} entries` : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50 text-left">
                  <tr>
                    <th className="p-4 font-medium w-8" />
                    <th className="p-4 font-medium">Timestamp</th>
                    <th className="p-4 font-medium">Actor</th>
                    <th className="p-4 font-medium">Action</th>
                    <th className="p-4 font-medium">Entity</th>
                    <th className="p-4 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => {
                    const isOpen = expanded.has(entry.id);
                    const hasData = !!(entry.beforeJson || entry.afterJson);
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          className={`border-b last:border-0 ${hasData ? "cursor-pointer hover:bg-neutral-50" : ""}`}
                          onClick={() => hasData && toggle(entry.id)}
                        >
                          <td className="pl-4 pr-1">
                            {hasData ? (
                              isOpen ? (
                                <ChevronDown className="w-4 h-4 text-neutral-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                              )
                            ) : null}
                          </td>
                          <td className="p-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                            {formatTs(entry.createdAt)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {entry.actorName ?? "System"}
                              </span>
                              <Badge className={`border-0 text-[10px] ${roleColor(entry.actorRole)}`}>
                                {entry.actorRole ?? "system"}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-4">
                            <code className="text-xs bg-neutral-100 px-2 py-0.5 rounded">
                              {entry.action}
                            </code>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{entry.entityType}</Badge>
                          </td>
                          <td className="p-4 font-mono text-neutral-600">
                            {entry.entityId ?? "—"}
                          </td>
                        </tr>
                        {isOpen && hasData && (
                          <tr>
                            <td colSpan={6} className="px-6 pb-4">
                              <JsonDiff before={entry.beforeJson} after={entry.afterJson} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
