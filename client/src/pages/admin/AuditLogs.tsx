import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

export default function AuditLogs() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, action],
    queryFn: () =>
      adminApi.auditLogs({
        entityType: entityType || undefined,
        action: action || undefined,
        limit: 200,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit logs</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Filter by action..."
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All entity types</option>
          <option value="user">User</option>
          <option value="asset">Asset</option>
          <option value="rental">Rental</option>
          <option value="legal_commitment">Legal</option>
          <option value="sanad_record">Sanad</option>
          <option value="payment">Payment</option>
          <option value="dispute">Dispute</option>
          <option value="shipment">Shipment</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No audit logs matching the filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {log.action}
                    </Badge>
                    <Badge className="bg-neutral-100 text-neutral-600 border-0 text-xs">
                      {log.entityType}
                      {log.entityId != null && ` #${log.entityId}`}
                    </Badge>
                    {log.actorRole && (
                      <span className="text-xs text-neutral-400">
                        by {log.actorRole}
                        {log.actorUserId ? ` (user ${log.actorUserId})` : ""}
                      </span>
                    )}
                  </div>
                  {log.ip && (
                    <p className="text-[11px] text-neutral-400 mt-1">IP: {log.ip}</p>
                  )}
                </div>
                <span className="text-xs text-neutral-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-SA")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
