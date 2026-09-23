import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, type AuditLog } from "@/lib/api";

const ENTITY_TYPES = ["", "user", "asset", "rental", "payment", "shipment", "dispute", "operational_alert"];

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("register")) return "bg-green-100 text-green-800";
  if (action.includes("block") || action.includes("reject") || action.includes("cancel")) return "bg-red-100 text-red-800";
  if (action.includes("close") || action.includes("resolve")) return "bg-blue-100 text-blue-800";
  return "bg-neutral-100 text-neutral-800";
}

export default function AuditLogs() {
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", offset, entityType],
    queryFn: () =>
      adminApi.auditLogs({
        limit,
        offset,
        entityType: entityType || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-amber-500" />
        <h1 className="text-3xl font-bold">Audit Logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setOffset(0);
          }}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t || "All entities"}
            </option>
          ))}
        </select>
        <span className="text-sm text-neutral-500">
          {total.toLocaleString()} total entries
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((log: AuditLog) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={actionColor(log.action)}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline">{log.entityType}</Badge>
                    {log.entityId && (
                      <span className="text-xs text-neutral-500">
                        #{log.entityId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
                    {log.actorRole && (
                      <span className="capitalize">{log.actorRole}</span>
                    )}
                    {log.actorUserId && <span>User #{log.actorUserId}</span>}
                    {log.ip && <span>{log.ip}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-neutral-500">
                    {new Date(log.createdAt).toLocaleDateString("en-SA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(log.createdAt).toLocaleTimeString("en-SA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-neutral-500">
          {offset + 1}–{Math.min(offset + limit, total)} of {total}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => setOffset(offset + limit)}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
