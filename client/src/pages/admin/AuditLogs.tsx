import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
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
  "inspection",
  "payment",
  "payout",
  "dispute",
  "legal_commitment",
  "sanad_record",
  "shipment",
  "operational_alert",
];

const ACTION_COLORS: Record<string, string> = {
  approve: "bg-green-100 text-green-800",
  reject: "bg-red-100 text-red-800",
  block: "bg-red-100 text-red-800",
  unblock: "bg-green-100 text-green-800",
  create: "bg-blue-100 text-blue-800",
  close: "bg-neutral-100 text-neutral-800",
  cancel: "bg-amber-100 text-amber-800",
  sign: "bg-purple-100 text-purple-800",
  execute: "bg-red-100 text-red-800",
  discharge: "bg-green-100 text-green-800",
};

function actionColor(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return cls;
  }
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [entityType, setEntityType] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, offset],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityType === "all" ? undefined : entityType,
        limit,
        offset,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-7 h-7 text-neutral-700" />
        <h1 className="text-3xl font-bold">Audit log</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex gap-4 mb-6">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setOffset(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All entities" : t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50 text-left">
                  <th className="px-4 py-3 font-medium text-neutral-500">Time</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Action</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Entity</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Actor</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Role</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                      Loading...
                    </td>
                  </tr>
                ) : !data || data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                      No audit entries found.
                    </td>
                  </tr>
                ) : (
                  data.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                        {new Date(entry.createdAt).toLocaleString("en-SA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={actionColor(entry.action)} variant="secondary">
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {entry.entityType}
                        {entry.entityId != null && (
                          <span className="text-neutral-400 ml-1">#{entry.entityId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {entry.actorUserId != null ? `User #${entry.actorUserId}` : "System"}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {entry.actorRole ?? "-"}
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

      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-neutral-500">
          Showing {offset + 1}–{offset + (data?.length ?? 0)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!data || data.length < limit}
          onClick={() => setOffset(offset + limit)}
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
