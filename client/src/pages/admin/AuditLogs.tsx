import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

export default function AuditLogs() {
  const [filter, setFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => adminApi.auditLogs(),
  });

  const logs = (data ?? []).filter((log: any) =>
    filter
      ? `${log.action} ${log.entityType} ${log.actorRole ?? ""}`
          .toLowerCase()
          .includes(filter.toLowerCase())
      : true
  );

  function actionColor(action: string): string {
    if (action.includes("block") || action.includes("reject") || action.includes("enforcement"))
      return "bg-red-100 text-red-700";
    if (action.includes("approve") || action.includes("close_clean") || action.includes("publish"))
      return "bg-green-100 text-green-700";
    if (action.includes("create") || action.includes("submit"))
      return "bg-blue-100 text-blue-700";
    return "bg-neutral-100 text-neutral-700";
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="Filter by action, entity type, or role..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit logs found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`border-0 ${actionColor(log.action)}`}>
                    {log.action}
                  </Badge>
                  <span className="text-sm text-neutral-500">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId}` : ""}
                  </span>
                  {log.actorRole && (
                    <Badge variant="outline" className="text-xs">
                      {log.actorRole}
                    </Badge>
                  )}
                  {log.actorUserId && (
                    <span className="text-xs text-neutral-400">
                      User #{log.actorUserId}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-neutral-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.ip && (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    IP: {log.ip}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
