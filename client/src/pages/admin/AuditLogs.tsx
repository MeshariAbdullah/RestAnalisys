import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  "",
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

const PAGE_SIZE = 30;

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, actionFilter, offset],
    queryFn: () =>
      adminApi.auditLogs({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType || undefined,
        action: actionFilter || undefined,
      }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t || "__all"} value={t}>
                {t || "All entity types"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setOffset(0);
          }}
          className="w-56"
        />
        <span className="text-sm text-neutral-500 self-center ml-auto">
          {total.toLocaleString()} entries
        </span>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Time</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Action</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Entity</th>
              <th className="px-4 py-3 font-medium text-neutral-500">ID</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Actor</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-400">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3">{log.entityType}</td>
                  <td className="px-4 py-3 text-neutral-500">{log.entityId ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {log.actorUserId ?? "system"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {log.actorRole ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-neutral-600">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
