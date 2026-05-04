import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Webhook, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, type IntegrationEvent } from "@/lib/api";

const PROVIDERS = ["all", "nafath", "nafith", "hyperpay", "zatca", "courier"];

export default function IntegrationEvents() {
  const [provider, setProvider] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["integration-events", provider],
    queryFn: () =>
      adminApi.integrationEvents({
        provider: provider === "all" ? undefined : provider,
        limit: 100,
      }),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Integration events</h1>
      <p className="text-neutral-500 mb-6">
        Monitor webhook and API calls to external services.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {PROVIDERS.map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              provider === p
                ? "bg-amber-500 text-neutral-950 font-medium"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Webhook className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No integration events found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">Time</th>
                  <th className="text-left p-4 font-medium">Provider</th>
                  <th className="text-left p-4 font-medium">Event</th>
                  <th className="text-left p-4 font-medium">Reference</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((evt: IntegrationEvent) => (
                  <tr key={evt.id} className="border-b last:border-0">
                    <td className="p-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{evt.provider}</Badge>
                    </td>
                    <td className="p-4 font-mono text-xs">{evt.eventType}</td>
                    <td className="p-4 font-mono text-xs text-neutral-500">
                      {evt.referenceId ?? "–"}
                    </td>
                    <td className="p-4">
                      {evt.error ? (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-xs text-red-600 truncate max-w-[200px]">
                            {evt.error}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-600">
                            {evt.processed ? "processed" : "pending"}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
