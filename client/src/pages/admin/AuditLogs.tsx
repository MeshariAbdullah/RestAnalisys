import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
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
import { adminApi, type AuditLogEntry } from "@/lib/api";

const ENTITY_TYPES = [
  "all",
  "user",
  "asset",
  "rental",
  "payment",
  "dispute",
  "sanad",
  "shipment",
  "inspection",
] as const;

const PAGE_SIZE = 50;

function actionColor(action: string): string {
  if (action.includes("block")) return "bg-red-100 text-red-700";
  if (action.includes("create") || action.includes("register")) return "bg-green-100 text-green-700";
  if (action.includes("update") || action.includes("change")) return "bg-blue-100 text-blue-700";
  if (action.includes("delete") || action.includes("reject")) return "bg-red-100 text-red-700";
  if (action.includes("approve") || action.includes("sign")) return "bg-green-100 text-green-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState("all");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter, offset],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityFilter === "all" ? undefined : entityFilter,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
      <p className="text-neutral-500 mb-6">
        Complete record of administrative actions across the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <Select
          value={entityFilter}
          onValueChange={(v) => {
            setEntityFilter(v);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All entities" : t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit logs found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.map((log: AuditLogEntry) => (
              <Card key={log.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="shrink-0 w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <ScrollText className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`border-0 text-xs ${actionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {log.entityType}
                        {log.entityId != null ? ` #${log.entityId}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                      <span>
                        {log.actorRole ? `${log.actorRole}` : "system"}
                        {log.actorUserId ? ` (user #${log.actorUserId})` : ""}
                      </span>
                      <span>·</span>
                      <span>{new Date(log.createdAt).toLocaleString("en-SA")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <span className="text-sm text-neutral-500">
              Showing {offset + 1}–{offset + data.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
