import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";

interface AuditEntry {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  beforeJson: unknown;
  afterJson: unknown;
  ip: string | null;
  createdAt: string;
}

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "user", label: "Users" },
  { value: "asset", label: "Assets" },
  { value: "rental", label: "Rentals" },
  { value: "payment", label: "Payments" },
  { value: "dispute", label: "Disputes" },
  { value: "legal_commitment", label: "Legal" },
  { value: "sanad_record", label: "Sanad" },
];

export default function AuditLog() {
  const [entityType, setEntityType] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () => {
      const params: Record<string, string> = { limit: "100" };
      if (entityType !== "all") params.entityType = entityType;
      const qs = new URLSearchParams(params);
      return fetch(`/api/admin/audit-logs?${qs}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to load audit logs");
        return r.json() as Promise<AuditEntry[]>;
      });
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
      <p className="text-neutral-500 mb-6">
        Immutable record of every material action on the platform.
      </p>

      <div className="flex items-center gap-4 mb-6">
        <Label className="text-sm text-neutral-500">Entity type:</Label>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No audit logs found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {data.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="border rounded-lg bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                  <span className="text-xs text-neutral-400 w-36 shrink-0">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {entry.entityType}
                  </Badge>
                  <span className="font-mono text-sm text-neutral-700 flex-1">
                    {entry.action}
                  </span>
                  {entry.actorRole && (
                    <Badge className="bg-neutral-100 text-neutral-600 border-0 shrink-0">
                      {entry.actorRole}
                    </Badge>
                  )}
                  {entry.entityId != null && (
                    <span className="text-xs text-neutral-400">
                      #{entry.entityId}
                    </span>
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t bg-neutral-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-500 text-xs uppercase mb-1">Actor</p>
                        <p>
                          User #{entry.actorUserId ?? "system"}{" "}
                          {entry.actorRole && `(${entry.actorRole})`}
                        </p>
                        {entry.ip && (
                          <p className="text-xs text-neutral-400">IP: {entry.ip}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-neutral-500 text-xs uppercase mb-1">Entity</p>
                        <p>
                          {entry.entityType} #{entry.entityId}
                        </p>
                      </div>
                    </div>
                    {entry.afterJson != null && (
                      <div className="mt-3">
                        <p className="text-neutral-500 text-xs uppercase mb-1">Details</p>
                        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-48">
                          {JSON.stringify(entry.afterJson, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
