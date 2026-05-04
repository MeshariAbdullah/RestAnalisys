import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminApi, type AuditLog } from "@/lib/api";

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("submit")) return "bg-green-100 text-green-700";
  if (action.includes("block") || action.includes("reject") || action.includes("enforcement")) return "bg-red-100 text-red-700";
  if (action.includes("approve") || action.includes("sign")) return "bg-blue-100 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityFilter || undefined,
        action: actionFilter || undefined,
        limit: 100,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Filter by entity type (e.g. rental, asset, user)"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by action (e.g. rental.create)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="max-w-xs"
        />
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
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">Time</th>
                  <th className="text-left p-4 font-medium">Action</th>
                  <th className="text-left p-4 font-medium">Entity</th>
                  <th className="text-left p-4 font-medium">Actor</th>
                  <th className="text-left p-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.map((log: AuditLog) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="p-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge className={`border-0 ${actionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                    <td className="p-4 text-xs">
                      {log.actorRole ?? "system"}
                      {log.actorUserId ? ` (#${log.actorUserId})` : ""}
                    </td>
                    <td className="p-4 text-xs text-neutral-400 font-mono">
                      {log.ip ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
