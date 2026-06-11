import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "dispute", "shipment", "sanad"];

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("register")) return "bg-green-100 text-green-700";
  if (action.includes("close") || action.includes("resolve")) return "bg-blue-100 text-blue-700";
  if (action.includes("cancel") || action.includes("reject") || action.includes("block")) return "bg-red-100 text-red-700";
  if (action.includes("approve") || action.includes("publish")) return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState("");
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", offset, entityType, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        limit,
        offset,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter || undefined,
      }),
  });

  const logs = data ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-amber-500" />
        <h1 className="text-3xl font-bold">Audit Logs</h1>
      </div>
      <p className="text-neutral-500 mb-8">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setOffset(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All entities" : t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by action (e.g. rental.create, asset.approve)..."
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No audit logs match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
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
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
                    <span>
                      {log.actorRole ? `${log.actorRole}` : "system"}
                      {log.actorUserId ? ` (user #${log.actorUserId})` : ""}
                    </span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    {log.ip && <span>IP: {log.ip}</span>}
                  </div>
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
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-neutral-500">
          Showing {offset + 1}–{offset + logs.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length < limit}
          onClick={() => setOffset(offset + limit)}
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
