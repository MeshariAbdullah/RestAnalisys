import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
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
  "user",
  "asset",
  "rental",
  "payment",
  "dispute",
  "shipment",
  "sanad",
  "legal",
];

export default function AuditLog() {
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, page],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityType === "all" ? undefined : entityType,
        limit: pageSize,
        offset: page * pageSize,
      }),
  });

  function actionColor(action: string): string {
    if (action.includes("create") || action.includes("register"))
      return "bg-green-100 text-green-700";
    if (action.includes("block") || action.includes("reject") || action.includes("cancel"))
      return "bg-red-100 text-red-700";
    if (action.includes("close") || action.includes("discharge"))
      return "bg-blue-100 text-blue-700";
    return "bg-neutral-100 text-neutral-700";
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit log</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
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

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="shrink-0 w-8 h-8 bg-neutral-100 rounded flex items-center justify-center">
                    <FileText className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`border-0 text-xs ${actionColor(entry.action)}`}>
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {entry.entityType}
                        {entry.entityId ? ` #${entry.entityId}` : ""}
                      </span>
                      {entry.actorRole && (
                        <span className="text-xs text-neutral-400">
                          by {entry.actorRole}
                          {entry.actorUserId ? ` (user #${entry.actorUserId})` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-neutral-500">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.length < pageSize}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
