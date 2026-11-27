import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Clock,
} from "lucide-react";
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

const ENTITY_TYPES = [
  "all",
  "user",
  "asset",
  "rental",
  "payment",
  "payout",
  "dispute",
  "inspection",
  "shipment",
  "sanad",
];

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  register: "bg-green-100 text-green-700",
  approve: "bg-blue-100 text-blue-700",
  reject: "bg-red-100 text-red-700",
  block: "bg-red-100 text-red-700",
  unblock: "bg-green-100 text-green-700",
  cancel: "bg-amber-100 text-amber-700",
  close: "bg-neutral-200 text-neutral-700",
  charge: "bg-purple-100 text-purple-700",
  refund: "bg-amber-100 text-amber-700",
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color;
  }
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityType, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        page,
        limit: 30,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter || undefined,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-neutral-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="text-sm text-neutral-500">
            Immutable record of every material action on the platform.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-44">
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by action (e.g. rental.create)"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No audit log entries match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((entry: AuditLogEntry) => (
              <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${getActionColor(entry.action)} border-0 text-xs`}>
                          {entry.action}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {entry.entityType}
                          {entry.entityId != null && ` #${entry.entityId}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entry.actorUserId
                            ? `User #${entry.actorUserId} (${entry.actorRole ?? "unknown"})`
                            : "System"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.createdAt).toLocaleString("en-SA")}
                        </span>
                        {entry.ip && (
                          <span className="text-neutral-400">{entry.ip}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-neutral-500">
              {data.total} entries &middot; page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
