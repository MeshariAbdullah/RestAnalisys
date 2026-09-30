import React, { useEffect, useState } from "react";
import { auditLogsApi, type AuditLogEntry } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const limit = 30;

  useEffect(() => {
    load();
  }, [offset, entityType, action]);

  async function load() {
    setLoading(true);
    try {
      const res = await auditLogsApi.list({
        entityType: entityType || undefined,
        action: action || undefined,
        limit,
        offset,
      });
      setLogs(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  const actionColors: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    approve: "bg-blue-100 text-blue-800",
    reject: "bg-red-100 text-red-800",
    block: "bg-red-100 text-red-800",
    sign: "bg-purple-100 text-purple-800",
    charge: "bg-green-100 text-green-800",
    refund: "bg-orange-100 text-orange-800",
  };

  function getActionColor(a: string): string {
    for (const [key, cls] of Object.entries(actionColors)) {
      if (a.includes(key)) return cls;
    }
    return "bg-neutral-100 text-neutral-700";
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ScrollText className="w-6 h-6" /> Audit Logs
      </h1>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Filter by entity type (e.g., rental)"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setOffset(0); }}
          className="w-64"
        />
        <Input
          placeholder="Filter by action (e.g., approve)"
          value={action}
          onChange={(e) => { setAction(e.target.value); setOffset(0); }}
          className="w-64"
        />
        <span className="text-sm text-neutral-500 self-center">
          {total} total entries
        </span>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            No audit logs found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <Badge variant="outline">
                        {log.entityType}
                        {log.entityId ? ` #${log.entityId}` : ""}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600">
                      <span className="font-medium">{log.actorName ?? `User #${log.actorUserId}`}</span>
                      {log.actorRole && (
                        <span className="text-neutral-400"> ({log.actorRole})</span>
                      )}
                      {log.ip && (
                        <span className="text-neutral-400 ml-2">IP: {log.ip}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-neutral-500">
          {offset + 1}&ndash;{Math.min(offset + limit, total)} of {total}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={offset + limit >= total}
          onClick={() => setOffset(offset + limit)}
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
