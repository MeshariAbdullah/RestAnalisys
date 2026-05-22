import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsApi } from "@/lib/api";
import type { AppNotification } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-SA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function notificationTypeColor(type: string): string {
  switch (type) {
    case "rental_created":
    case "rental_status_changed":
      return "bg-blue-100 text-blue-700";
    case "asset_approved":
    case "inspection_complete":
      return "bg-green-100 text-green-700";
    case "asset_rejected":
      return "bg-red-100 text-red-700";
    case "payment_captured":
      return "bg-amber-100 text-amber-700";
    case "dispute_update":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export default function Notifications() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", page],
    queryFn: () => notificationsApi.list(page, 20),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications: AppNotification[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {lang === "ar" ? "الإشعارات" : "Notifications"}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {lang === "ar"
              ? "جميع الإشعارات والتحديثات"
              : "All your notifications and updates"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          className="flex items-center gap-2"
        >
          <CheckCheck className="w-4 h-4" />
          {lang === "ar" ? "تعليم الكل كمقروء" : "Mark all as read"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="w-12 h-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 font-medium">
              {lang === "ar" ? "لا توجد إشعارات" : "No notifications yet"}
            </p>
            <p className="text-neutral-400 text-sm mt-1">
              {lang === "ar"
                ? "ستظهر الإشعارات هنا عند وجود تحديثات"
                : "Notifications will appear here when there are updates"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors cursor-pointer hover:bg-neutral-50 ${
                !n.read ? "border-l-4 border-l-amber-500" : ""
              }`}
              onClick={() => {
                if (!n.read) markReadMutation.mutate(n.id);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${notificationTypeColor(n.type)}`}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-neutral-900 text-sm">
                        {lang === "ar" && n.titleAr ? n.titleAr : n.title}
                      </p>
                      {!n.read && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5">
                          {lang === "ar" ? "جديد" : "New"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {lang === "ar" && n.bodyAr ? n.bodyAr : n.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-neutral-400">
                        {timeAgo(n.createdAt)}
                      </span>
                      {n.entityType && (
                        <Badge variant="outline" className="text-[10px]">
                          {n.entityType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {lang === "ar" ? "السابق" : "Previous"}
              </Button>
              <span className="text-sm text-neutral-500">
                {lang === "ar"
                  ? `صفحة ${page} من ${pagination.totalPages}`
                  : `Page ${page} of ${pagination.totalPages}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {lang === "ar" ? "التالي" : "Next"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
