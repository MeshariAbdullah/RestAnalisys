import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi, type AuditLog } from "@/lib/api";

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityType, action],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const ACTION_COLORS: Record<string, string> = {
    register: "bg-blue-100 text-blue-800",
    login: "bg-green-100 text-green-800",
    block: "bg-red-100 text-red-800",
    unblock: "bg-green-100 text-green-800",
    verified: "bg-emerald-100 text-emerald-800",
    change_password: "bg-yellow-100 text-yellow-800",
    profile_update: "bg-sky-100 text-sky-800",
  };

  function actionColor(a: string): string {
    for (const [key, cls] of Object.entries(ACTION_COLORS)) {
      if (a.includes(key)) return cls;
    }
    return "bg-neutral-100 text-neutral-700";
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-amber-500" />
        <h1 className="text-3xl font-bold">Audit Logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of all system actions for compliance and forensics.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by action..."
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className="pl-9 w-56"
          />
        </div>
        <Input
          placeholder="Entity type (user, asset...)"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(0);
          }}
          className="w-52"
        />
        {(action || entityType) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction("");
              setEntityType("");
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        )}
        {data && (
          <span className="ml-auto text-sm text-neutral-500 self-center">
            {data.total} total entries
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-neutral-500">Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-8 text-center text-neutral-500">No audit entries found.</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50">
                    <th className="text-left p-3 font-medium">Timestamp</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Entity</th>
                    <th className="text-left p-3 font-medium">Actor</th>
                    <th className="text-left p-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log: AuditLog) => (
                    <tr key={log.id} className="border-b hover:bg-neutral-50/50">
                      <td className="p-3 whitespace-nowrap text-neutral-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-3">
                        <Badge className={actionColor(log.action)} variant="secondary">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-neutral-500">{log.entityType}</span>
                        {log.entityId != null && (
                          <span className="ml-1 font-mono text-xs">#{log.entityId}</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.actorRole && (
                          <Badge variant="outline" className="mr-1 text-xs capitalize">
                            {log.actorRole}
                          </Badge>
                        )}
                        {log.actorUserId != null && (
                          <span className="font-mono text-xs">user #{log.actorUserId}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-neutral-500">
                        {log.ip ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-neutral-600">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
