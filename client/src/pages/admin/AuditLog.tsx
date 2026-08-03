import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";

const ENTITY_COLORS: Record<string, string> = {
  user: "bg-blue-100 text-blue-700",
  asset: "bg-purple-100 text-purple-700",
  rental: "bg-green-100 text-green-700",
  payment: "bg-amber-100 text-amber-700",
  dispute: "bg-red-100 text-red-700",
  legal: "bg-indigo-100 text-indigo-700",
  sanad: "bg-teal-100 text-teal-700",
  inspection: "bg-orange-100 text-orange-700",
};

function ActionBadge({ action }: { action: string }) {
  const parts = action.split(".");
  const verb = parts[parts.length - 1];
  let color = "bg-neutral-100 text-neutral-700";
  if (["create", "register", "submit", "open"].includes(verb))
    color = "bg-green-100 text-green-700";
  else if (["update", "approve", "sign", "verify", "verified", "publish", "received"].includes(verb))
    color = "bg-blue-100 text-blue-700";
  else if (["delete", "reject", "block", "cancel", "close"].includes(verb))
    color = "bg-red-100 text-red-700";
  else if (["fulfill", "delivered", "returned", "discharge"].includes(verb))
    color = "bg-amber-100 text-amber-700";
  return <Badge className={`${color} border-0 font-mono text-xs`}>{action}</Badge>;
}

export default function AuditLog() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter],
    queryFn: () => adminApi.auditLogs(entityFilter === "all" ? undefined : entityFilter),
  });

  const filtered = (data ?? []).filter((log: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(s) ||
      log.entityType.toLowerCase().includes(s) ||
      String(log.entityId).includes(s) ||
      (log.actorRole ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <ScrollText className="w-8 h-8" /> Audit Log
      </h1>
      <p className="text-neutral-500 mb-8">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search actions, entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="asset">Assets</SelectItem>
            <SelectItem value="rental">Rentals</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="dispute">Disputes</SelectItem>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="sanad">Sanad</SelectItem>
            <SelectItem value="inspection">Inspections</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No audit entries match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log: any) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ActionBadge action={log.action} />
                      <Badge
                        className={`${
                          ENTITY_COLORS[log.entityType] ?? "bg-neutral-100 text-neutral-700"
                        } border-0 text-xs`}
                      >
                        {log.entityType}
                        {log.entityId ? ` #${log.entityId}` : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1">
                      {log.actorUserId && (
                        <span>
                          User #{log.actorUserId}
                          {log.actorRole ? ` (${log.actorRole})` : ""}
                        </span>
                      )}
                      {log.ip && <span>IP: {log.ip}</span>}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-SA", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </p>
                </div>
                {(log.beforeJson || log.afterJson) && (
                  <details className="mt-2">
                    <summary className="text-xs text-amber-600 cursor-pointer hover:underline">
                      View changes
                    </summary>
                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                      {log.beforeJson && (
                        <div className="bg-red-50 rounded p-2 text-xs overflow-auto max-h-40">
                          <p className="font-semibold text-red-700 mb-1">Before</p>
                          <pre className="whitespace-pre-wrap break-all text-neutral-600">
                            {JSON.stringify(log.beforeJson, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.afterJson && (
                        <div className="bg-green-50 rounded p-2 text-xs overflow-auto max-h-40">
                          <p className="font-semibold text-green-700 mb-1">After</p>
                          <pre className="whitespace-pre-wrap break-all text-neutral-600">
                            {JSON.stringify(log.afterJson, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
