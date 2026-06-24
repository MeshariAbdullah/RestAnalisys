import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { auditApi } from "@/lib/api";
import { ScrollText } from "lucide-react";

interface AuditEntry {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  createdAt: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    auditApi
      .list({ limit: 200, entityType: filter || undefined })
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const entityTypes = ["rental", "asset", "payment", "user", "dispute", "sanad", "inspection"];

  const actionColors: Record<string, string> = {
    create: "text-green-700",
    approve: "text-blue-700",
    reject: "text-red-700",
    cancel: "text-orange-700",
    close: "text-purple-700",
    block: "text-red-700",
    unblock: "text-green-700",
  };

  function getActionColor(action: string): string {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.includes(key)) return color;
    }
    return "text-neutral-700";
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <ScrollText className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-bold">Audit Log</h1>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter("")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !filter ? "bg-amber-500 text-white" : "bg-neutral-100 hover:bg-neutral-200"
            }`}
          >
            All
          </button>
          {entityTypes.map((et) => (
            <button
              key={et}
              onClick={() => setFilter(et)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                filter === et
                  ? "bg-amber-500 text-white"
                  : "bg-neutral-100 hover:bg-neutral-200"
              }`}
            >
              {et}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-neutral-500 text-center py-12">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-neutral-500 text-center py-12">No audit entries found.</p>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b text-left">
                  <th className="px-4 py-3 font-medium text-neutral-500">Time</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Action</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Entity</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Actor</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${getActionColor(log.action)}`}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize">{log.entityType}</span>
                      {log.entityId != null && (
                        <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.actorRole && (
                        <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded capitalize">
                          {log.actorRole}
                        </span>
                      )}
                      {log.actorUserId && (
                        <span className="text-neutral-400 ml-1 text-xs">
                          ID:{log.actorUserId}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
