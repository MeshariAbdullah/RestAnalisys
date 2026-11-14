import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  "user",
  "asset",
  "rental",
  "payment",
  "dispute",
  "sanad",
  "inspection",
];

const PAGE_SIZE = 25;

export default function AuditLog() {
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-8 h-8 text-neutral-400" />
        <h1 className="text-3xl font-bold">Audit log</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of all material actions on the platform.
      </p>

      <div className="flex gap-3 mb-6">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
          <SelectTrigger className="w-40">
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
        <Input
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="w-60"
        />
        <span className="ml-auto text-sm text-neutral-500 self-center">
          {total.toLocaleString()} entries
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No audit entries found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="p-3">Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="p-3 whitespace-nowrap text-neutral-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-neutral-600">{entry.entityType}</span>
                      {entry.entityId != null && (
                        <span className="text-neutral-400 ml-1">#{entry.entityId}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {entry.actorUserId ? (
                        <span>
                          <span className="text-neutral-500">User #{entry.actorUserId}</span>
                          {entry.actorRole && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {entry.actorRole}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-400">system</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-400 font-mono text-xs">
                      {entry.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-neutral-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
