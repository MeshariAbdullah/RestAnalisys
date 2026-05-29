import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const query = useQuery({
    queryKey: ["audit-logs", page, entityFilter, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        entityType: entityFilter || undefined,
        action: actionFilter || undefined,
      }),
  });

  const { items = [], total = 0 } = query.data ?? {};
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-7 h-7 text-amber-600" />
        <h1 className="text-3xl font-bold">Audit logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex gap-3 mb-4">
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(0);
          }}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All entities</option>
          <option value="user">User</option>
          <option value="asset">Asset</option>
          <option value="rental">Rental</option>
          <option value="payment">Payment</option>
          <option value="dispute">Dispute</option>
          <option value="sanad">Sanad</option>
        </select>
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
        />
        <span className="text-sm text-neutral-500 self-center">
          {total} total entries
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Entity</th>
                <th className="text-left p-3 font-medium">Actor</th>
                <th className="text-left p-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log: any) => (
                <tr key={log.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3 text-neutral-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="p-3">
                    <span className="text-neutral-700">{log.entityType}</span>
                    {log.entityId != null && (
                      <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {log.actorRole && (
                      <Badge className="mr-1 text-xs" variant="secondary">
                        {log.actorRole}
                      </Badge>
                    )}
                    {log.actorUserId ? `#${log.actorUserId}` : "system"}
                  </td>
                  <td className="p-3 text-neutral-400 font-mono text-xs">
                    {log.ip ?? "-"}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    {query.isLoading ? "Loading..." : "No audit entries found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-neutral-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
