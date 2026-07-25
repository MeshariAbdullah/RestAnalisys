import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api";
import Layout from "@/components/Layout";

const ENTITY_COLORS: Record<string, string> = {
  user: "bg-blue-100 text-blue-700",
  asset: "bg-amber-100 text-amber-700",
  rental: "bg-green-100 text-green-700",
  payment: "bg-purple-100 text-purple-700",
  payout: "bg-indigo-100 text-indigo-700",
  dispute: "bg-red-100 text-red-700",
  inspection: "bg-cyan-100 text-cyan-700",
  legal_commitment: "bg-pink-100 text-pink-700",
  sanad_record: "bg-orange-100 text-orange-700",
  shipment: "bg-teal-100 text-teal-700",
  operational_alert: "bg-yellow-100 text-yellow-700",
};

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
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
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ScrollText className="w-7 h-7" /> Audit Log
        </h1>
        <p className="text-neutral-500 mb-6">
          Immutable record of every material action on the platform.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Filter by entity type..."
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setOffset(0);
            }}
            className="max-w-[200px]"
          />
          <Input
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setOffset(0);
            }}
            className="max-w-[200px]"
          />
        </div>

        {isLoading ? (
          <div className="text-neutral-400 text-center py-16">Loading...</div>
        ) : !logs?.length ? (
          <div className="text-neutral-400 text-center py-16">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No audit entries found</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-neutral-50">
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-left p-3 font-medium">Entity</th>
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Actor</th>
                      <th className="text-left p-3 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b last:border-0 hover:bg-neutral-50"
                      >
                        <td className="p-3 text-neutral-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-xs">{log.action}</td>
                        <td className="p-3">
                          <Badge
                            className={
                              ENTITY_COLORS[log.entityType] ??
                              "bg-neutral-100 text-neutral-700"
                            }
                          >
                            {log.entityType}
                          </Badge>
                        </td>
                        <td className="p-3 text-neutral-500">
                          {log.entityId ?? "-"}
                        </td>
                        <td className="p-3 text-neutral-500">
                          {log.actorUserId ?? "system"}
                        </td>
                        <td className="p-3">
                          {log.actorRole && (
                            <Badge variant="outline" className="text-xs">
                              {log.actorRole}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-neutral-400">
            Showing {offset + 1} - {offset + (logs?.length ?? 0)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(logs?.length ?? 0) < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
