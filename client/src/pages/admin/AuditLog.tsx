import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, type AuditLogEntry } from "@/lib/api";

const ENTITY_TYPES = ["", "user", "asset", "rental", "payment", "dispute", "shipment"];
const PAGE_SIZE = 30;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionColor(action: string): string {
  if (action.includes("reject") || action.includes("block") || action.includes("cancel"))
    return "bg-red-100 text-red-700";
  if (action.includes("approve") || action.includes("publish") || action.includes("create"))
    return "bg-green-100 text-green-700";
  if (action.includes("close") || action.includes("discharge"))
    return "bg-blue-100 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", offset, entityType, actionFilter],
    queryFn: () =>
      adminApi.auditLog({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType || undefined,
        action: actionFilter || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-7 h-7 text-amber-600" />
          <h1 className="text-3xl font-bold">Audit Log</h1>
        </div>
        <p className="text-neutral-500 mb-6">
          Immutable record of all material actions across the platform.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setOffset(0);
              }}
              className="pl-9 w-60"
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setOffset(0);
            }}
            className="h-10 px-3 rounded-md border border-neutral-300 text-sm bg-white"
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-neutral-500 self-center">
            {total.toLocaleString()} entries
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Entity</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Actor</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
                        Loading...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
                        No audit log entries found
                      </td>
                    </tr>
                  ) : (
                    items.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={actionColor(entry.action)}>
                            {entry.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-neutral-600">{entry.entityType}</span>
                          {entry.entityId && (
                            <span className="text-neutral-400 ml-1">#{entry.entityId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-neutral-600">
                            {entry.actorRole ?? "system"}
                          </span>
                          {entry.actorUserId && (
                            <span className="text-neutral-400 ml-1">
                              (#{entry.actorUserId})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 font-mono text-xs">
                          {entry.ip ?? "-"}
                        </td>
                      </tr>
                    ))
                  )}
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
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-neutral-500">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
  );
}
