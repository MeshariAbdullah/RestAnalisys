import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { auditApi, type AuditLog } from "@/lib/api";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityTypeFilter],
    queryFn: () =>
      auditApi.list({
        page,
        limit,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  function entityColor(type: string) {
    const map: Record<string, string> = {
      rental: "bg-blue-100 text-blue-700",
      user: "bg-purple-100 text-purple-700",
      asset: "bg-amber-100 text-amber-700",
      payment: "bg-green-100 text-green-700",
      dispute: "bg-red-100 text-red-700",
    };
    return map[type] ?? "bg-neutral-100 text-neutral-700";
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of all platform actions ({data?.total ?? 0} total).
      </p>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All entities</option>
          <option value="user">User</option>
          <option value="asset">Asset</option>
          <option value="rental">Rental</option>
          <option value="payment">Payment</option>
          <option value="dispute">Dispute</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items.map((log: AuditLog) => (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-SA")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono">
                          {log.actorRole ?? "system"}
                          {log.actorUserId ? ` #${log.actorUserId}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${entityColor(log.entityType)}`}>
                          {log.entityType}
                          {log.entityId ? ` #${log.entityId}` : ""}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 font-mono">
                        {log.ip ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
