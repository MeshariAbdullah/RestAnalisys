import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";

const PAGE_SIZE = 50;

const ENTITY_TYPES = ["user", "asset", "rental", "payment", "dispute", "sanad", "shipment", "inspection"];

function actionColor(action: string): string {
  if (action.includes("block")) return "bg-red-100 text-red-700";
  if (action.includes("create") || action.includes("register")) return "bg-green-100 text-green-700";
  if (action.includes("delete") || action.includes("cancel")) return "bg-red-100 text-red-700";
  if (action.includes("update") || action.includes("sign")) return "bg-blue-100 text-blue-700";
  if (action.includes("verify") || action.includes("approve")) return "bg-green-100 text-green-700";
  if (action.includes("reject")) return "bg-orange-100 text-orange-700";
  if (action.includes("execute")) return "bg-purple-100 text-purple-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityTypeFilter],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
        entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
        <p className="text-neutral-500 mb-6">
          Immutable record of all administrative actions on the platform.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Input
            placeholder="Filter by action (e.g. user.block)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="w-64"
          />
          <Select
            value={entityTypeFilter}
            onValueChange={(v) => {
              setEntityTypeFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entity types</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && (
            <span className="text-sm text-neutral-500 ml-auto">
              {data.total} total entries
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-neutral-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              No audit log entries found.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-neutral-50 text-left">
                      <tr>
                        <th className="p-4 font-medium">Time</th>
                        <th className="p-4 font-medium">Action</th>
                        <th className="p-4 font-medium">Entity</th>
                        <th className="p-4 font-medium">Actor</th>
                        <th className="p-4 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((log) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="p-4 text-neutral-600 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Badge className={`border-0 ${actionColor(log.action)}`}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-neutral-600">{log.entityType}</span>
                            {log.entityId != null && (
                              <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                            )}
                          </td>
                          <td className="p-4">
                            {log.actorUserId ? (
                              <span className="text-neutral-600">
                                User #{log.actorUserId}
                                {log.actorRole && (
                                  <Badge variant="outline" className="ml-2 text-xs">{log.actorRole}</Badge>
                                )}
                              </span>
                            ) : (
                              <span className="text-neutral-400">System</span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs text-neutral-500">
                            {log.ip ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-neutral-500">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
  );
}
