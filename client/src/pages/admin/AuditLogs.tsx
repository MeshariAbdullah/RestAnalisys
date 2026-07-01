import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, type AuditLogEntry } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("register") || action.includes("submit"))
    return "bg-green-100 text-green-800";
  if (action.includes("reject") || action.includes("block") || action.includes("cancel"))
    return "bg-red-100 text-red-800";
  if (action.includes("approve") || action.includes("sign") || action.includes("close"))
    return "bg-blue-100 text-blue-800";
  return "bg-neutral-100 text-neutral-800";
}

const PAGE_SIZE = 30;

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityFilter, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        entityType: entityFilter || undefined,
        action: actionFilter || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 mb-1">
        <ScrollText className="w-6 h-6" /> Audit Logs
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        Immutable record of all material actions ({total.toLocaleString()} entries)
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by entity type (user, asset, rental...)"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search action (e.g. rental.create, asset.approve)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No audit logs match your filters</p>
        </div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Entity</th>
                  <th className="text-left p-3">Actor</th>
                  <th className="text-left p-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="p-3 text-neutral-500 text-xs whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="p-3">
                      <Badge className={actionColor(log.action)} variant="secondary">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-neutral-600">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {log.actorUserId ? (
                        <span className="text-neutral-600">
                          User #{log.actorUserId}
                          {log.actorRole && (
                            <span className="text-neutral-400 ml-1">({log.actorRole})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-400">System</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-400 text-xs font-mono">
                      {log.ip ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-neutral-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
