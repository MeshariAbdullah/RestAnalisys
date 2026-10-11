import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";

const ENTITY_TYPES = [
  "all",
  "asset",
  "rental",
  "payment",
  "payout",
  "user",
  "shipment",
  "operational_alert",
  "system",
];

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, page],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityType === "all" ? undefined : entityType,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-7 h-7 text-amber-600" />
        <h1 className="text-3xl font-bold">Audit logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-48">
          <Select
            value={entityType}
            onValueChange={(v) => {
              setEntityType(v);
              setPage(0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Entity type" />
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
        <span className="text-sm text-neutral-500">
          {total} total entries
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50/50">
                  <th className="text-left p-3 font-medium text-neutral-500">
                    Time
                  </th>
                  <th className="text-left p-3 font-medium text-neutral-500">
                    Action
                  </th>
                  <th className="text-left p-3 font-medium text-neutral-500">
                    Entity
                  </th>
                  <th className="text-left p-3 font-medium text-neutral-500">
                    Actor
                  </th>
                  <th className="text-left p-3 font-medium text-neutral-500">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-neutral-400">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-neutral-400">
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  items.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-neutral-50/50">
                      <td className="p-3 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-neutral-500">
                          {entry.entityType}
                        </span>
                        {entry.entityId != null && (
                          <span className="ml-1 font-mono text-xs text-neutral-400">
                            #{entry.entityId}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {entry.actorRole && (
                          <Badge
                            variant="secondary"
                            className="text-xs mr-1"
                          >
                            {entry.actorRole}
                          </Badge>
                        )}
                        {entry.actorUserId != null && (
                          <span className="text-xs text-neutral-400">
                            user #{entry.actorUserId}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-neutral-400">
                        {entry.ip ?? "—"}
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
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
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
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
