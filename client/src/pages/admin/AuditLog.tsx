import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ChevronLeft, ChevronsRight } from "lucide-react";
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
import { adminApi, type AuditLog as AuditLogEntry } from "@/lib/api";

const PAGE_SIZE = 30;

function actionColor(action: string): string {
  if (/cancel|block|reject|breach|enforcement|delete|void/.test(action))
    return "bg-red-100 text-red-700";
  if (/create|register|submit|approve/.test(action))
    return "bg-green-100 text-green-700";
  if (/sign|verify|confirm|fulfill|deliver|close|discharge/.test(action))
    return "bg-blue-100 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

function formatTs(iso: string): string {
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

function JsonDiff({ label, data }: { label: string; data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 mb-1">{label}</p>
      <pre className="text-xs bg-neutral-100 rounded p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

const ENTITY_TYPES = ["user", "asset", "rental", "payment", "dispute", "shipment", "sanad"];

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityFilter],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter,
        entityType: entityFilter,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
      <h1 className="text-3xl font-bold mb-2">Audit log</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={entityFilter ?? "__all__"}
          onValueChange={(v) => {
            setEntityFilter(v === "__all__" ? undefined : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All entities</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {actionFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActionFilter(undefined);
              setPage(0);
            }}
          >
            Clear action: {actionFilter} &times;
          </Button>
        )}

        <span className="ml-auto text-sm text-neutral-500 self-center">
          {total} entries
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No audit entries found.</div>
          ) : (
            <div className="divide-y">
              {items.map((entry: AuditLogEntry) => {
                const isOpen = expanded.has(entry.id);
                const hasDiff = entry.beforeJson || entry.afterJson;
                return (
                  <div key={entry.id}>
                    <button
                      onClick={() => hasDiff && toggle(entry.id)}
                      className="w-full text-left px-5 py-3 hover:bg-neutral-50 transition-colors flex items-start gap-3"
                    >
                      <span className="mt-1 shrink-0 text-neutral-400">
                        {hasDiff ? (
                          isOpen ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </span>

                      <span className="w-40 shrink-0 text-xs text-neutral-500 mt-0.5">
                        {formatTs(entry.createdAt)}
                      </span>

                      <span className="w-36 shrink-0">
                        <span className="text-sm font-medium truncate block">
                          {entry.actorName ?? "System"}
                        </span>
                        {entry.actorRole && (
                          <span className="text-[11px] text-neutral-500">
                            {entry.actorRole}
                          </span>
                        )}
                      </span>

                      <Badge
                        className={`${actionColor(entry.action)} border-0 cursor-pointer shrink-0`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionFilter(entry.action);
                          setPage(0);
                        }}
                      >
                        {entry.action}
                      </Badge>

                      <span className="text-sm text-neutral-600 ml-2">
                        {entry.entityType}
                        {entry.entityId != null && (
                          <span className="text-neutral-400"> #{entry.entityId}</span>
                        )}
                      </span>

                      {entry.ip && (
                        <span className="ml-auto text-xs text-neutral-400 shrink-0">
                          {entry.ip}
                        </span>
                      )}
                    </button>

                    {isOpen && hasDiff && (
                      <div className="px-14 pb-4 grid md:grid-cols-2 gap-4">
                        <JsonDiff label="Before" data={entry.beforeJson} />
                        <JsonDiff label="After" data={entry.afterJson} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-neutral-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronsRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
