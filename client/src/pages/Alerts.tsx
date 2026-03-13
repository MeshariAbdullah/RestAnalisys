import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi, storesApi } from "@/lib/api";
import type { Alert } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bell, AlertTriangle, CheckCircle, Clock, Filter, RefreshCw } from "lucide-react";
import { formatDate, getSeverityColor, getSeverityLabel } from "@/lib/utils";

function AlertCard({ alert, onUpdateStatus }: { alert: Alert; onUpdateStatus: (status: string) => void }) {
  return (
    <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-muted/30 transition-colors">
      <div className={`p-2 rounded-lg shrink-0 ${getSeverityColor(alert.severity)}`}>
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <Badge className={getSeverityColor(alert.severity)}>
            {getSeverityLabel(alert.severity)}
          </Badge>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
            alert.provider === "gemini" ? "badge-gemini" : "badge-gpt"
          }`}>
            {alert.provider === "gemini" ? "Gemini" : "GPT-4o"}
          </span>
          <Badge variant={
            alert.status === "open" ? "destructive" : alert.status === "acknowledged" ? "warning" : "success"
          }>
            {alert.status === "open" ? "مفتوح" : alert.status === "acknowledged" ? "قيد المعالجة" : "تم الحل"}
          </Badge>
        </div>
        <p className="text-sm font-medium leading-relaxed">{alert.message}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(alert.createdAt)}
          </span>
          {alert.storeName && <span>• {alert.storeName}</span>}
          {alert.videoId && <span>• فيديو #{alert.videoId}</span>}
          <span>• نوع: {alert.type}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {alert.status === "open" && (
          <Button size="sm" variant="outline" onClick={() => onUpdateStatus("acknowledged")}>
            قيد المعالجة
          </Button>
        )}
        {alert.status !== "resolved" && (
          <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => onUpdateStatus("resolved")}>
            <CheckCircle className="w-3 h-3 ml-1" />
            حل
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Alerts() {
  const queryClient = useQueryClient();
  const [filterStore, setFilterStore] = useState<string>("");
  const [filterProvider, setFilterProvider] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { data: stores } = useQuery({ queryKey: ["stores"], queryFn: storesApi.list });
  const { data: alertStats } = useQuery({
    queryKey: ["alert-stats"],
    queryFn: alertsApi.getStats,
    refetchInterval: 15_000,
  });

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ["alerts", filterStore, filterProvider, filterStatus],
    queryFn: () => alertsApi.list({
      storeId: filterStore ? parseInt(filterStore) : undefined,
      provider: filterProvider || undefined,
      status: filterStatus || undefined,
      limit: 100,
    }),
    refetchInterval: 10_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      alertsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alert-stats"] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">التنبيهات</h1>
          <p className="text-muted-foreground text-sm">مراقبة وإدارة تنبيهات الجودة والسلامة</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      {alertStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "إجمالي التنبيهات", value: alertStats.total, color: "bg-gray-100 text-gray-800" },
            { label: "مفتوحة", value: alertStats.open, color: "bg-red-100 text-red-800" },
            { label: "حرجة", value: alertStats.critical, color: "bg-red-100 text-red-800" },
            { label: "مرتفعة", value: alertStats.high, color: "bg-orange-100 text-orange-800" },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex gap-3 flex-wrap flex-1">
              <div className="min-w-[160px]">
                <Select value={filterStore} onValueChange={setFilterStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الفروع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الفروع</SelectItem>
                    {stores?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <Select value={filterProvider} onValueChange={setFilterProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل المزودين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل المزودين</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="gpt_frames">GPT-4o</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الحالات</SelectItem>
                    <SelectItem value="open">مفتوح</SelectItem>
                    <SelectItem value="acknowledged">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">تم الحل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterStore || filterProvider || filterStatus) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterStore(""); setFilterProvider(""); setFilterStatus(""); }}
                >
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جارٍ التحميل...</div>
          ) : !alerts?.length ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد تنبيهات</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onUpdateStatus={(status) => updateStatusMutation.mutate({ id: alert.id, status })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
