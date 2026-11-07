import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api";

const ENTITY_TYPES = [
  { value: "", label: "All types" },
  { value: "user", label: "User" },
  { value: "asset", label: "Asset" },
  { value: "rental", label: "Rental" },
  { value: "payment", label: "Payment" },
  { value: "dispute", label: "Dispute" },
  { value: "sanad", label: "Sanad" },
  { value: "inspection", label: "Inspection" },
  { value: "shipment", label: "Shipment" },
];

const PAGE_SIZE = 25;

function actionColor(action: string): string {
  if (action.includes("block")) return "bg-red-100 text-red-700";
  if (action.includes("create") || action.includes("approve"))
    return "bg-green-100 text-green-700";
  if (action.includes("reject") || action.includes("cancel"))
    return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", entityType, offset],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-8">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setOffset(0);
          }}
          className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-neutral-500">
          {total} record{total !== 1 ? "s" : ""}
        </span>
      </div>

      {isError ? (
        <Card>
          <CardContent className="p-12 text-center text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-300" />
            Failed to load audit logs. Please try again.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Time</th>
                    <th className="text-left p-4 font-medium">Actor</th>
                    <th className="text-left p-4 font-medium">Action</th>
                    <th className="text-left p-4 font-medium">Entity</th>
                    <th className="text-left p-4 font-medium">Entity ID</th>
                    <th className="text-left p-4 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="p-4 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {log.actorRole ? (
                          <Badge variant="outline" className="text-xs">
                            {log.actorRole}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400">system</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={`border-0 ${actionColor(log.action)}`}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-4 text-neutral-600">
                        {log.entityType}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {log.entityId != null ? `#${log.entityId}` : "—"}
                      </td>
                      <td className="p-4 text-xs text-neutral-400 font-mono">
                        {log.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-neutral-500">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
              {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
