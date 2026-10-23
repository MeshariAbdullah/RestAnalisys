import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search } from "lucide-react";
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
import { adminApi, type AuditLogEntry } from "@/lib/api";

const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  { value: "all", label: "All Entity Types" },
  { value: "user", label: "User" },
  { value: "rental", label: "Rental" },
  { value: "asset", label: "Asset" },
  { value: "dispute", label: "Dispute" },
  { value: "payment", label: "Payment" },
];

function actionColor(action: string): string {
  if (action.startsWith("create") || action.startsWith("insert")) return "bg-green-100 text-green-700";
  if (action.startsWith("update") || action.startsWith("edit")) return "bg-blue-100 text-blue-700";
  if (action.startsWith("delete") || action.startsWith("remove")) return "bg-red-100 text-red-700";
  if (action.startsWith("approve")) return "bg-emerald-100 text-emerald-700";
  if (action.startsWith("reject") || action.startsWith("deny")) return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-700";
}

function JsonDiff({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <div>
        <p className="text-xs font-semibold text-neutral-500 mb-1">{label}</p>
        <p className="text-xs text-neutral-400 italic">None</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 mb-1">{label}</p>
      <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLog() {
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log", entityType, actionFilter, offset],
    queryFn: () =>
      adminApi.auditLog({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter.trim() || undefined,
      }),
  });

  const entries: AuditLogEntry[] = data ?? [];
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  function handleEntityTypeChange(value: string) {
    setEntityType(value);
    setOffset(0);
    setExpandedId(null);
  }

  function handleActionFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
    setActionFilter(e.target.value);
    setOffset(0);
    setExpandedId(null);
  }

  function toggleExpand(id: number) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
      <p className="text-neutral-500 mb-6">
        Review all system actions and changes across the platform.
      </p>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="w-52">
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Entity Type</label>
            <Select value={entityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Action</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search actions..."
                value={actionFilter}
                onChange={handleActionFilterChange}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : isError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          Failed to load audit log entries.
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-8 h-8 mx-auto mb-3 text-neutral-400" />
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50 text-left">
                  <th className="px-4 py-3 font-medium text-neutral-600 w-8"></th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Date/Time</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Action</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Entity Type</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Entity ID</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">User ID</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <tr
                      className="border-b hover:bg-neutral-50 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border-0 ${actionColor(entry.action)}`}>
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 capitalize">{entry.entityType}</td>
                      <td className="px-4 py-3 font-mono text-neutral-600">
                        {entry.entityId ?? "---"}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-600">
                        {entry.userId ?? "---"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                        {entry.ipAddress ?? "---"}
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr className="bg-neutral-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <JsonDiff label="Before" data={entry.beforeJson} />
                            <JsonDiff label="After" data={entry.afterJson} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-neutral-500">
          Page {page}{entries.length > 0 && ` · Showing ${entries.length} entries`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={entries.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
