import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";

const PAGE_SIZE = 30;

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", offset, entityFilter, actionFilter],
    queryFn: () =>
      adminApi.auditLog({
        limit: PAGE_SIZE,
        offset,
        entityType: entityFilter || undefined,
        action: actionFilter || undefined,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of all system actions.
      </p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Input
          placeholder="Filter by entity type (e.g. rental)"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setOffset(0);
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by action (e.g. approve)"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setOffset(0);
          }}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data?.items || data.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No audit log entries found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((entry: Record<string, unknown>) => (
              <Card key={String(entry.id)}>
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {String(entry.entity_type)}.{String(entry.entity_id ?? "?")}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {String(entry.action)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {entry.actor_name
                        ? `${String(entry.actor_name)} (${String(entry.actor_email)})`
                        : "System"}{" "}
                      &middot;{" "}
                      {new Date(String(entry.created_at)).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="text-xs bg-neutral-100 text-neutral-700 border-0">
                    {String(entry.actor_role ?? "system")}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-neutral-500">
              Showing {offset + 1}–{offset + data.items.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.items.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
