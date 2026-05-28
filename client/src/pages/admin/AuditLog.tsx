import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { adminApi, type AuditLogEntry } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Shield, Activity } from "lucide-react";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "dispute", "shipment"];
const PAGE_SIZE = 30;

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("submit")) return "bg-green-100 text-green-800";
  if (action.includes("block") || action.includes("reject") || action.includes("enforcement"))
    return "bg-red-100 text-red-800";
  if (action.includes("close") || action.includes("discharge")) return "bg-blue-100 text-blue-800";
  if (action.includes("cancel")) return "bg-orange-100 text-orange-800";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", offset, entityType],
    queryFn: () =>
      adminApi.auditLog({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType === "all" ? undefined : entityType,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <span className="text-sm text-neutral-500 ml-auto">{total} entries</span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setOffset(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All Entities" : t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-neutral-500">Loading audit log...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">No audit entries found.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((entry: AuditLogEntry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString("en-SA")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={actionColor(entry.action)} variant="secondary">
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">
                        {entry.entityType}#{entry.entityId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {entry.actorRole && (
                        <span className="text-xs bg-neutral-200 px-1.5 py-0.5 rounded mr-1">
                          {entry.actorRole}
                        </span>
                      )}
                      #{entry.actorUserId ?? "system"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-neutral-500">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
