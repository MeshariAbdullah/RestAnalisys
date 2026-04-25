import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";

const ENTITY_TYPES = [
  "all",
  "user",
  "asset",
  "inspection",
  "rental",
  "payment",
  "dispute",
  "sanad",
  "shipment",
];

function actionColor(action: string): string {
  if (action.includes("block")) return "bg-red-100 text-red-700";
  if (action.includes("reject") || action.includes("cancel"))
    return "bg-red-100 text-red-700";
  if (action.includes("create") || action.includes("approve"))
    return "bg-green-100 text-green-700";
  if (action.includes("sign") || action.includes("confirm"))
    return "bg-blue-100 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

interface AuditLog {
  id: number;
  actorUserId?: number;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: number;
  createdAt: string;
}

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter],
    queryFn: () =>
      adminApi.auditLogs(entityFilter === "all" ? undefined : entityFilter),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-neutral-500">Filter by entity:</span>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All entities" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit logs found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((log: AuditLog) => (
            <Card key={log.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="shrink-0 w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <ScrollText className="w-4 h-4 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`border-0 ${actionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline">{log.entityType}</Badge>
                    {log.entityId && (
                      <span className="text-xs text-neutral-500">
                        #{log.entityId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {log.actorRole && (
                      <span className="capitalize">{log.actorRole} · </span>
                    )}
                    User #{log.actorUserId ?? "system"} ·{" "}
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
