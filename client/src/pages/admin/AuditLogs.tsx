import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import Layout from "@/components/Layout";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "payout", "dispute", "sanad"];
const PAGE_SIZE = 30;

function actionColor(action: string): string {
  if (action.includes("approve") || action.includes("verified") || action.includes("clean")) return "bg-green-100 text-green-700";
  if (action.includes("reject") || action.includes("block") || action.includes("enforcement")) return "bg-red-100 text-red-700";
  if (action.includes("create") || action.includes("submit") || action.includes("register")) return "bg-blue-100 text-blue-700";
  if (action.includes("cancel") || action.includes("refund")) return "bg-orange-100 text-orange-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, actionFilter, page],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <ScrollText className="w-6 h-6" />
              Audit Logs
            </h1>
            <p className="text-neutral-500 mt-1">
              {total.toLocaleString()} total entries
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
            <SelectTrigger className="w-44">
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
          <Input
            placeholder="Filter by action (e.g. rental.create)..."
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-neutral-400">
              <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No audit logs match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Actor</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log: any) => (
                    <tr key={log.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-SA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={actionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {log.entityType}
                        {log.entityId ? ` #${log.entityId}` : ""}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {log.actorRole && (
                          <span className="text-xs text-neutral-400 mr-1">[{log.actorRole}]</span>
                        )}
                        {log.actorUserId ? `User #${log.actorUserId}` : "System"}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-xs font-mono">
                        {log.ip ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-neutral-500">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
