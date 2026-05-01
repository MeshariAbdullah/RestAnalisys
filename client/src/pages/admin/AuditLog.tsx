import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

const ENTITY_TYPES = ["", "user", "asset", "rental", "payment", "payout", "inspection", "dispute", "report"];
const PAGE_SIZE = 50;

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const query = useQuery({
    queryKey: ["audit-log", offset, entityType, actionFilter],
    queryFn: () =>
      adminApi.auditLog({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType || undefined,
        action: actionFilter || undefined,
      }),
  });

  const logs = query.data ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <Shield className="w-7 h-7" /> Audit Log
      </h1>
      <p className="text-neutral-500 mb-6">Immutable record of every material action on the platform.</p>

      <div className="flex gap-3 mb-6 items-center">
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setOffset(0); }}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          className="border rounded px-3 py-1.5 text-sm w-48"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Actor</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Entity</th>
                <th className="text-left p-3 font-medium">ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-neutral-400">
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-neutral-50">
                    <td className="p-3 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {log.actorRole && (
                        <Badge variant="outline" className="mr-1 text-xs">{log.actorRole}</Badge>
                      )}
                      <span className="text-xs text-neutral-500">#{log.actorUserId}</span>
                    </td>
                    <td className="p-3">
                      <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{log.action}</code>
                    </td>
                    <td className="p-3 capitalize">{log.entityType}</td>
                    <td className="p-3 text-neutral-500">{log.entityId ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-neutral-500">
          Showing {offset + 1}–{offset + logs.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={logs.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
