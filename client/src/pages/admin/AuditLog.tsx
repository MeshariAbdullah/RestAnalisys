import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: number;
  actorUserId?: number;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: number;
  createdAt: string;
}

async function fetchAuditLogs(): Promise<AuditEntry[]> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("/api/admin/audit-log", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AuditLog() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: fetchAuditLogs,
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-neutral-500 text-center py-12">No audit entries yet.</p>
      ) : (
        <div className="space-y-1">
          {data.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {entry.action}
                    <span className="text-neutral-500 font-normal ml-2">
                      on {entry.entityType}
                      {entry.entityId ? ` #${entry.entityId}` : ""}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-400">
                    by user #{entry.actorUserId ?? "system"}
                    {entry.actorRole && ` (${entry.actorRole})`}
                  </p>
                </div>
                <span className="text-xs text-neutral-400 whitespace-nowrap">
                  {timeAgo(entry.createdAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
