import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

const ENTITY_TYPES = [
  "all",
  "user",
  "asset",
  "rental",
  "payment",
  "dispute",
  "shipment",
  "inspection",
  "legal_commitment",
  "sanad",
];

function actionColor(action: string): string {
  if (action.includes("create") || action.includes("approve")) return "bg-emerald-100 text-emerald-700";
  if (action.includes("block") || action.includes("reject") || action.includes("delete")) return "bg-red-100 text-red-700";
  if (action.includes("update") || action.includes("sign")) return "bg-blue-100 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AuditLogs() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityType, actionFilter],
    queryFn: () =>
      adminApi.auditLogs({
        page,
        limit: 25,
        entityType: entityType === "all" ? undefined : entityType,
        action: actionFilter || undefined,
      }),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-amber-500" />
          {t("audit.title")}
        </h1>
        <p className="text-neutral-500 mt-1">
          {locale === "ar"
            ? "سجل كامل لجميع الإجراءات على المنصة"
            : "Complete record of all platform actions"}
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder={locale === "ar" ? "بحث في الإجراءات..." : "Search actions..."}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((et) => (
              <SelectItem key={et} value={et}>
                {et === "all" ? (locale === "ar" ? "جميع الكيانات" : "All Entities") : et}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">
                    {t("audit.timestamp")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">
                    {t("audit.action")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">
                    {t("audit.entity")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">
                    {t("audit.actor")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-4 bg-neutral-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-neutral-400">
                      {t("common.noResults")}
                    </td>
                  </tr>
                ) : (
                  data?.items.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                        {new Date(log.createdAt).toLocaleString(
                          locale === "ar" ? "ar-SA" : "en-SA"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={actionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-neutral-700">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-neutral-400 ml-1">#{log.entityId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.actorRole && (
                          <Badge variant="outline" className="text-xs">
                            {log.actorRole}
                          </Badge>
                        )}
                        {log.actorUserId && (
                          <span className="text-neutral-500 ml-1 text-xs">
                            ID:{log.actorUserId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs font-mono">
                        {log.ip ?? "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-neutral-50">
              <p className="text-sm text-neutral-500">
                {t("common.page")} {data.page} {t("common.of")} {data.totalPages}
                {" "}({data.total} {locale === "ar" ? "سجل" : "records"})
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("common.next")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
