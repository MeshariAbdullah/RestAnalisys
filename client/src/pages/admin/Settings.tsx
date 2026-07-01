import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon, Plug, Shield, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

function IntegrationStatus({ status }: { status: string }) {
  const color =
    status === "live"
      ? "bg-green-100 text-green-700"
      : status === "stub"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  return <Badge className={`border-0 ${color}`}>{status}</Badge>;
}

export default function AdminSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.settings(),
  });

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-96 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" /> Platform Settings
      </h1>
      <p className="text-sm text-neutral-500">
        Configuration overview and integration status.
      </p>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Platform Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Row label="Platform Name" value={data?.platform.name} />
            <Row label="Version" value={data?.platform.version} />
            <Row label="VAT Rate" value={`${(data?.platform.vatRate ?? 0) * 100}%`} />
            <Row label="Platform Fee" value={`${data?.platform.platformFeePct}%`} />
            <Row label="Commission" value={`${data?.platform.commissionPct}%`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plug className="w-5 h-5 text-amber-500" /> Integrations
          </h2>
          <div className="space-y-3">
            {data &&
              Object.entries(data.integrations).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize">{key}</p>
                    <p className="text-xs text-neutral-500">{val.description}</p>
                  </div>
                  <IntegrationStatus status={val.status} />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-500" /> Rate Limits & Constraints
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {data &&
              Object.entries(data.limits).map(([key, val]) => (
                <Row
                  key={key}
                  label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  value={String(val)}
                />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
