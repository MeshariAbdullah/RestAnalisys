import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { notificationsApi, type Notification } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  rental_created: "bg-blue-100 text-blue-800",
  rental_closed: "bg-green-100 text-green-800",
  asset_approved: "bg-emerald-100 text-emerald-800",
  asset_rejected: "bg-red-100 text-red-800",
  payment_captured: "bg-amber-100 text-amber-800",
  dispute_opened: "bg-orange-100 text-orange-800",
  payout_released: "bg-teal-100 text-teal-800",
  overdue_warning: "bg-red-100 text-red-800",
  system: "bg-gray-100 text-gray-800",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-SA");
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });
  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: notificationsApi.unreadCount,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-amber-500 text-white">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors"
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-neutral-500 text-center py-12">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p>No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: Notification) => (
              <Card
                key={n.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !n.read ? "border-l-4 border-l-amber-500 bg-amber-50/30" : "opacity-75"
                }`}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                }}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{n.title}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${TYPE_COLORS[n.type] ?? TYPE_COLORS.system}`}
                        >
                          {n.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-neutral-400">{formatTime(n.createdAt)}</span>
                      {n.read && <Check className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
