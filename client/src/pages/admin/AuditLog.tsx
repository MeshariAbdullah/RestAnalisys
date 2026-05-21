import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminExtApi } from "@/lib/api";

const ENTITY_TYPES = ["all", "user", "asset", "rental", "payment", "dispute", "sanad"];

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityType, actionFilter],
    queryFn: () =>
      adminExtApi.auditLogs({
        page,
        limit: 30,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter || undefined,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-neutral-500">
            Immutable trail of all platform actions
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
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
          className="w-56"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        />
        <div className="ml-auto text-sm text-neutral-500 self-center">
          {data ? `${data.total} entries` : ""}
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : (
        <>
          <div className="space-y-2">
            {data?.items.map((entry) => (
              <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {entry.entityType}
                      </Badge>
                      <span className="text-sm font-medium">{entry.action}</span>
                      {entry.entityId && (
                        <span className="text-xs text-neutral-400">
                          #{entry.entityId}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 flex gap-3">
                      <span>
                        Actor: {entry.actorRole ?? "system"}
                        {entry.actorUserId ? ` (ID ${entry.actorUserId})` : ""}
                      </span>
                      {entry.ip && <span>IP: {entry.ip}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("en-SA")}
                  </div>
                </CardContent>
              </Card>
            ))}
            {data?.items.length === 0 && (
              <p className="text-neutral-500 text-center py-8">
                No audit entries found.
              </p>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-neutral-600">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
