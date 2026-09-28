import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminApi, type AuditLogEntry } from "@/lib/api";

export default function AuditLogs() {
  const [cursor, setCursor] = useState<number | undefined>();
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", cursor, actionFilter, entityFilter],
    queryFn: () =>
      adminApi.auditLogs({
        cursor,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        limit: 50,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-neutral-700" />
        <h1 className="text-3xl font-bold">Audit logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of every mutation in the system.
      </p>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Filter by action (e.g. user.block)"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCursor(undefined);
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by entity type"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setCursor(undefined);
          }}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.rows.map((entry: AuditLogEntry) => (
              <Card key={entry.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{entry.action}</Badge>
                      <span className="text-xs text-neutral-500">
                        {entry.entityType}
                        {entry.entityId != null && ` #${entry.entityId}`}
                      </span>
                      {entry.actorRole && (
                        <Badge className="bg-neutral-200 text-neutral-700 text-xs">
                          {entry.actorRole}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-neutral-500">
                      <span>
                        User #{entry.actorUserId ?? "system"}
                      </span>
                      <span>{entry.ip}</span>
                      <span>
                        {new Date(entry.createdAt).toLocaleString("en-SA")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            {cursor && (
              <Button
                variant="outline"
                onClick={() => setCursor(undefined)}
              >
                First page
              </Button>
            )}
            {data.nextCursor && (
              <Button
                variant="outline"
                onClick={() => setCursor(data.nextCursor!)}
              >
                Next page
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
