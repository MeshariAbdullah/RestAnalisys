import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, type AuditLog } from "@/lib/api";
import { cn } from "@/lib/utils";

const ENTITY_TYPES = ["", "user", "asset", "rental", "payment", "dispute", "shipment"];
const PAGE_SIZE = 25;

function actionColor(action: string) {
  if (action.includes("create") || action.includes("submit")) return "bg-green-100 text-green-800";
  if (action.includes("block") || action.includes("reject") || action.includes("cancel")) return "bg-red-100 text-red-800";
  if (action.includes("approve") || action.includes("close_clean")) return "bg-blue-100 text-blue-800";
  return "bg-neutral-100 text-neutral-800";
}

function formatTimestamp(ts: string) {
  return new Intl.DateTimeFormat("en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, actionFilter, page],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        entityType: entityType || undefined,
        action: actionFilter || undefined,
      }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-amber-600" />
          Audit Logs
        </h1>
        <p className="text-neutral-500 mt-1">
          Immutable record of all material actions on the platform.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(0); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <Input
          placeholder="Filter by action (e.g. rental.cancel)"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="max-w-xs"
        />
        <div className="flex-1" />
        <p className="text-sm text-neutral-500 self-center">
          {data?.total ?? 0} records
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !data?.items?.length ? (
        <div className="text-center py-20 text-neutral-500">
          No audit records match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((log: AuditLog) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge className={cn("w-fit text-xs", actionColor(log.action))}>
                    {log.action}
                  </Badge>
                  <span className="text-sm text-neutral-600">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId}` : ""}
                  </span>
                  <span className="text-xs text-neutral-400 sm:ml-auto">
                    {log.actorRole && (
                      <span className="mr-2 text-neutral-500">
                        [{log.actorRole}]
                      </span>
                    )}
                    {formatTimestamp(log.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-neutral-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
