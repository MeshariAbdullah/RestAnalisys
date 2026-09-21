import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Filter } from "lucide-react";
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
import { auditApi, type AuditLog } from "@/lib/api";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ACTION_COLORS: Record<string, string> = {
  "auth.": "bg-blue-100 text-blue-800",
  "asset.": "bg-purple-100 text-purple-800",
  "rental.": "bg-green-100 text-green-800",
  "payment.": "bg-amber-100 text-amber-800",
  "payout.": "bg-amber-100 text-amber-800",
  "legal.": "bg-red-100 text-red-800",
  "user.": "bg-cyan-100 text-cyan-800",
  "dispute.": "bg-orange-100 text-orange-800",
};

function actionColor(action: string): string {
  for (const [prefix, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(prefix)) return cls;
  }
  return "bg-neutral-100 text-neutral-800";
}

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: actions } = useQuery({
    queryKey: ["audit-actions"],
    queryFn: auditApi.actions,
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", actionFilter, page],
    queryFn: () =>
      auditApi.logs({
        limit,
        offset: page * limit,
        action: actionFilter === "all" ? undefined : actionFilter,
      }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Audit Logs</h1>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-neutral-500" />
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions?.map((a) => (
              <SelectItem key={a.action} value={a.action}>
                {a.action} ({a.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-neutral-500">Loading...</div>}

      <div className="space-y-2">
        {logs?.map((log: AuditLog) => (
          <Card key={log.id}>
            <CardContent className="p-4 flex items-center gap-4 text-sm">
              <Badge className={actionColor(log.action)}>
                {log.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <span className="text-neutral-600">
                  {log.entityType}
                  {log.entityId ? ` #${log.entityId}` : ""}
                </span>
                {log.actorRole && (
                  <span className="text-neutral-400 ml-2">
                    by {log.actorRole}
                    {log.actorUserId ? ` (user ${log.actorUserId})` : ""}
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400 shrink-0">
                {formatDate(log.createdAt)}
              </span>
              {log.ip && (
                <span className="text-[10px] text-neutral-400 shrink-0">
                  {log.ip}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {logs && logs.length > 0 && (
        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-neutral-500">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={logs.length < limit}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
