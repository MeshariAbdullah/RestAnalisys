import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auditApi } from "@/lib/api";

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", actionFilter, page],
    queryFn: () =>
      auditApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
      }),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of all material actions ({total} entries)
      </p>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by action (e.g. rental.cancel)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit logs found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Entity</th>
                  <th className="pb-2 pr-4">Actor</th>
                  <th className="pb-2 pr-4">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-neutral-50">
                    <td className="py-3 pr-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className="bg-neutral-100 text-neutral-700 font-mono text-xs">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-neutral-700">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                    <td className="py-3 pr-4 text-neutral-500">
                      {log.actorRole ?? "-"}
                      {log.actorUserId ? ` (${log.actorUserId})` : ""}
                    </td>
                    <td className="py-3 pr-4 text-xs text-neutral-400 font-mono">
                      {log.ip ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-neutral-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
