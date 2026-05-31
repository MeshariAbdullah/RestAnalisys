import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("approve")) return "bg-green-100 text-green-700";
  if (action.includes("block") || action.includes("reject") || action.includes("enforcement")) return "bg-red-100 text-red-700";
  if (action.includes("cancel") || action.includes("penalty")) return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-700";
}

export default function AuditLog() {
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => adminApi.auditLogs(),
  });

  const filtered = (data ?? []).filter((log) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      (log.actorRole ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
          <p className="text-neutral-500">
            Immutable record of every material action on the platform.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {data?.length ?? 0} entries
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-neutral-400" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action, entity type, or role..."
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading audit log...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {filter ? "No entries match your filter." : "No audit entries yet."}
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
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="p-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge className={`border-0 ${actionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {log.actorRole && (
                        <Badge variant="outline" className="text-xs">
                          {log.actorRole}
                        </Badge>
                      )}
                      {log.actorUserId && (
                        <span className="text-neutral-400 text-xs ml-1">
                          user #{log.actorUserId}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-neutral-400 font-mono">
                      {log.ip ?? "—"}
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
