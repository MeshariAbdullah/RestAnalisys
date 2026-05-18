import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Package, FileText, ShieldAlert, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Layout from "@/components/Layout";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rental_created: FileText,
  rental_delivered: Package,
  rental_closed: CheckCheck,
  asset_approved: ShieldAlert,
  asset_rejected: ShieldAlert,
  payment: CreditCard,
};

function timeAgo(dateStr: string, lang: "ar" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return lang === "ar" ? "الآن" : "Just now";
  if (minutes < 60) return lang === "ar" ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "ar" ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ar" ? `منذ ${days} يوم` : `${days}d ago`;
}

export default function NotificationsPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("notifications.title")}</h1>
            <p className="text-neutral-500 mt-1">{t("notifications.subtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 me-2" />
              {t("common.markAllRead")}
            </Button>
          )}
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">{t("common.noNotifications")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n: Notification) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              const title = lang === "ar" ? n.titleAr : n.titleEn;
              const body = lang === "ar" ? n.bodyAr : n.bodyEn;
              return (
                <Card
                  key={n.id}
                  className={`cursor-pointer transition-colors ${!n.isRead ? "border-amber-300 bg-amber-50/50" : ""}`}
                  onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? "bg-amber-100 text-amber-600" : "bg-neutral-100 text-neutral-400"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!n.isRead ? "text-neutral-900" : "text-neutral-600"}`}>
                          {title}
                        </p>
                        {!n.isRead && (
                          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                            {lang === "ar" ? "جديد" : "New"}
                          </Badge>
                        )}
                      </div>
                      {body && (
                        <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{body}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-1.5">
                        {timeAgo(n.createdAt, lang)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
