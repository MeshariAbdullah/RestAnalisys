import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { adminApi } from "@/lib/api";

export default function AuditLog() {
  const [entityType, setEntityType] = useState("");
  const [limit, setLimit] = useState(100);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", entityType, limit],
    queryFn: () => adminApi.auditLogs({ limit, entityType: entityType || undefined }),
  });

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ScrollText className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Audit Log</h1>
            <p className="text-neutral-500">Immutable record of platform actions</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All entities</option>
            <option value="user">User</option>
            <option value="asset">Asset</option>
            <option value="rental">Rental</option>
            <option value="payment">Payment</option>
            <option value="shipment">Shipment</option>
            <option value="dispute">Dispute</option>
            <option value="upload">Upload</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value={50}>50 entries</option>
            <option value={100}>100 entries</option>
            <option value={200}>200 entries</option>
            <option value={500}>500 entries</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : !data || data.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-neutral-500">
              No audit entries found.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                  <th className="px-3 py-3 font-medium">Entity</th>
                  <th className="px-3 py-3 font-medium">ID</th>
                  <th className="px-3 py-3 font-medium">Actor</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry: any) => (
                  <tr key={entry.id} className="border-b hover:bg-neutral-50">
                    <td className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString("en-SA")}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-xs font-mono">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize">{entry.entityType}</td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.entityId ?? "-"}</td>
                    <td className="px-3 py-2">{entry.actorUserId ?? "system"}</td>
                    <td className="px-3 py-2 text-xs">{entry.actorRole ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-neutral-400">{entry.ip ?? "-"}</td>
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
