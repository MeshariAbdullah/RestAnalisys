import { useEffect, useState } from "react";
import Layout from "../../components/Layout";

interface AuditLog {
  id: number;
  actorUserId?: number;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: number;
  ip?: string;
  createdAt: string;
}

interface PaginatedResponse {
  items: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export default function AuditLogs() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ page: String(page), limit: "25" });
        if (entityTypeFilter) qs.set("entityType", entityTypeFilter);
        if (actionFilter) qs.set("action", actionFilter);

        const res = await fetch(`${API_BASE}/admin/audit-logs?${qs}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) setData(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, entityTypeFilter, actionFilter]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("en-SA", {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>

        <div className="flex gap-4">
          <input
            className="border rounded px-3 py-1.5 text-sm"
            placeholder="Filter by entity type..."
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="border rounded px-3 py-1.5 text-sm"
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Entity</th>
                    <th className="text-left p-3">Actor</th>
                    <th className="text-left p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap text-gray-500">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="p-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.entityType}
                        {log.entityId != null && ` #${log.entityId}`}
                      </td>
                      <td className="p-3">
                        {log.actorRole && (
                          <span className="text-gray-500 text-xs">
                            [{log.actorRole}]
                          </span>
                        )}{" "}
                        {log.actorUserId ? `User #${log.actorUserId}` : "System"}
                      </td>
                      <td className="p-3 text-gray-400 text-xs">{log.ip ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!data.pagination.hasPrev}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.pagination.hasNext}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">No audit logs found</div>
        )}
      </div>
    </Layout>
  );
}
