import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

async function fetchAuditLogs(entityType?: string, limit = 100): Promise<AuditLog[]> {
  const token = localStorage.getItem("auth_token");
  const params = new URLSearchParams();
  if (entityType && entityType !== "all") params.set("entityType", entityType);
  params.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/admin/audit-logs?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load audit logs");
  return res.json();
}

const ACTION_COLOR: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  approve: "bg-blue-100 text-blue-700",
  reject: "bg-red-100 text-red-700",
  block: "bg-red-100 text-red-700",
  unblock: "bg-green-100 text-green-700",
  cancel: "bg-amber-100 text-amber-800",
  close: "bg-green-100 text-green-700",
  fulfill: "bg-blue-100 text-blue-700",
  sign: "bg-blue-100 text-blue-700",
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLOR)) {
    if (action.includes(key)) return color;
  }
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter],
    queryFn: () => fetchAuditLogs(entityFilter),
  });

  const filtered = (data ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      String(log.entityId).includes(q) ||
      (log.actorRole?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-6 h-6 text-amber-500" />
        <h1 className="text-3xl font-bold">Audit Logs</h1>
      </div>
      <p className="text-neutral-500 mb-6">
        Immutable record of all material actions on the platform.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search actions, entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="rental">Rental</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="dispute">Dispute</SelectItem>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="sanad">Sanad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No audit logs found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getActionColor(log.action)} border-0`}>
                        {log.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {log.entityType}#{log.entityId}
                      </Badge>
                      {log.actorRole && (
                        <span className="text-xs text-neutral-400">
                          by {log.actorRole} (user #{log.actorUserId})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString("en-SA")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
