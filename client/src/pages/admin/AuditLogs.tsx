import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "user", label: "User" },
  { value: "asset", label: "Asset" },
  { value: "rental", label: "Rental" },
  { value: "payment", label: "Payment" },
  { value: "dispute", label: "Dispute" },
  { value: "shipment", label: "Shipment" },
];

function actionColor(action: string): string {
  if (action.startsWith("create") || action.startsWith("insert"))
    return "bg-green-100 text-green-800";
  if (action.startsWith("update") || action.startsWith("edit"))
    return "bg-blue-100 text-blue-700";
  if (action.startsWith("delete") || action.startsWith("remove"))
    return "bg-red-100 text-red-700";
  if (action.startsWith("block"))
    return "bg-orange-100 text-orange-700";
  return "bg-neutral-200 text-neutral-700";
}

function roleColor(role: string): string {
  if (role === "super_admin") return "bg-purple-100 text-purple-800";
  if (role === "admin") return "bg-amber-100 text-amber-800";
  if (role === "operations") return "bg-blue-100 text-blue-700";
  return "bg-neutral-200 text-neutral-700";
}

export default function AuditLogs() {
  const [entityType, setEntityType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () =>
      adminApi.auditLogs(
        entityType === "all" ? undefined : { entityType }
      ),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
      <p className="text-neutral-500 mb-8">
        Track all administrative actions across the platform.
      </p>

      {/* Filter row */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-56">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by entity" />
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
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : isError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {(error as Error).message}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
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
                  <th className="px-4 py-3 font-medium text-neutral-600">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600">
                    Action
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600">
                    Entity
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600">
                    Actor Role
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-600">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry: any) => (
                  <React.Fragment key={entry.id}>
                    <tr
                      className="border-b hover:bg-neutral-50 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedId(
                          expandedId === entry.id ? null : entry.id
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        {expandedId === entry.id ? (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`border-0 ${actionColor(entry.action)}`}
                        >
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium">{entry.entityType}</span>
                        <span className="text-neutral-400 ml-1">
                          #{entry.entityId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`border-0 ${roleColor(entry.actorRole)}`}
                        >
                          {entry.actorRole?.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 font-mono text-xs">
                        {entry.ip ?? "—"}
                      </td>
                    </tr>

                    {expandedId === entry.id && (
                      <tr className="bg-neutral-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-neutral-700 mb-1">
                                Actor
                              </p>
                              <p className="text-neutral-500">
                                User #{entry.actorUserId} ({entry.actorRole})
                              </p>
                              {entry.userAgent && (
                                <p className="text-neutral-400 mt-1 break-all">
                                  UA: {entry.userAgent}
                                </p>
                              )}
                            </div>
                            <div />

                            {entry.beforeJson && (
                              <div>
                                <p className="font-semibold text-neutral-700 mb-1">
                                  Before
                                </p>
                                <pre className="bg-white border rounded p-3 overflow-x-auto max-h-60 text-neutral-700">
                                  {JSON.stringify(entry.beforeJson, null, 2)}
                                </pre>
                              </div>
                            )}

                            {entry.afterJson && (
                              <div>
                                <p className="font-semibold text-neutral-700 mb-1">
                                  After
                                </p>
                                <pre className="bg-white border rounded p-3 overflow-x-auto max-h-60 text-neutral-700">
                                  {JSON.stringify(entry.afterJson, null, 2)}
                                </pre>
                              </div>
                            )}

                            {!entry.beforeJson && !entry.afterJson && (
                              <div className="col-span-2">
                                <p className="text-neutral-400 italic">
                                  No before/after data recorded for this entry.
                                </p>
                              </div>
                            )}
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
    </div>
  );
}
