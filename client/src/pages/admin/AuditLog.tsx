import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, type AuditLogEntry } from "@/lib/api";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "dispute", "shipment"];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("register") || action.includes("submit"))
    return "bg-green-100 text-green-700";
  if (action.includes("block") || action.includes("reject") || action.includes("cancel"))
    return "bg-red-100 text-red-700";
  if (action.includes("approve") || action.includes("verified") || action.includes("publish"))
    return "bg-blue-100 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLog() {
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        limit: 100,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter || undefined,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-6 h-6 text-neutral-500" />
        <h1 className="text-3xl font-bold">Audit Log</h1>
      </div>
      <p className="text-neutral-500 mb-8">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by action (e.g. rental.create, asset.approve)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All entities" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">Actor</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry: AuditLogEntry) => (
                  <tr key={entry.id} className="border-b hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                      <span title={new Date(entry.createdAt).toLocaleString()}>
                        {timeAgo(entry.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={actionColor(entry.action)}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-neutral-600">
                        {entry.entityType}
                        {entry.entityId != null && (
                          <span className="text-neutral-400"> #{entry.entityId}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {entry.actorUserId != null ? (
                        <span>
                          User #{entry.actorUserId}
                          {entry.actorRole && (
                            <span className="text-neutral-400 ml-1">({entry.actorRole})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-400">system</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 font-mono text-xs">
                      {entry.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
