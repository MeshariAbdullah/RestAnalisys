import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { analyticsApi } from "@/lib/api";

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("approve")) return "bg-green-100 text-green-700";
  if (action.includes("delete") || action.includes("block") || action.includes("reject"))
    return "bg-red-100 text-red-700";
  if (action.includes("close") || action.includes("cancel")) return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityFilter],
    queryFn: () =>
      analyticsApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
      }),
  });

  const { data: summary } = useQuery({
    queryKey: ["audit-summary"],
    queryFn: () => analyticsApi.auditLogSummary(),
  });

  return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ScrollText className="w-7 h-7 text-amber-500" />
          <h1 className="text-2xl font-bold">Audit Logs</h1>
        </div>

        {summary && summary.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-neutral-500 mb-2">
              Activity summary (last 30 days)
            </h2>
            <div className="flex flex-wrap gap-2">
              {summary.slice(0, 10).map((s, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer hover:bg-neutral-200"
                  onClick={() => {
                    setActionFilter(s.action);
                    setEntityFilter(s.entity_type);
                    setPage(0);
                  }}
                >
                  {s.action} ({s.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="w-48"
            />
          </div>
          <Input
            placeholder="Filter by entity type..."
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            className="w-48"
          />
          {(actionFilter || entityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActionFilter("");
                setEntityFilter("");
                setPage(0);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {isLoading && <p className="text-neutral-500 py-8 text-center">Loading...</p>}

        <div className="space-y-2">
          {logs?.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={actionColor(log.action)} variant="secondary">
                      {log.action}
                    </Badge>
                    <Badge variant="outline">{log.entityType}</Badge>
                    {log.entityId && (
                      <span className="text-xs text-neutral-400">#{log.entityId}</span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400">
                    {new Date(log.createdAt).toLocaleString("en-SA")}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                  {log.actorRole && <span>Role: {log.actorRole}</span>}
                  {log.actorUserId && <span>User #{log.actorUserId}</span>}
                  {log.ip && <span>IP: {log.ip}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {logs && logs.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-neutral-500">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={logs.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
  );
}
