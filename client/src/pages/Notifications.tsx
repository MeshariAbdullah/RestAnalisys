import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type AppNotification } from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  rental_status_change: "bg-blue-100 text-blue-700",
  payment_confirmed: "bg-green-100 text-green-700",
  inspection_complete: "bg-amber-100 text-amber-700",
  dispute_update: "bg-red-100 text-red-700",
  asset_status_change: "bg-purple-100 text-purple-700",
  sanad_update: "bg-indigo-100 text-indigo-700",
  system_alert: "bg-neutral-200 text-neutral-700",
};

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const deleteNotif = useMutation({
    mutationFn: (id: number) => notificationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-neutral-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: AppNotification) => (
            <Card
              key={n.id}
              className={`transition-colors ${
                n.isRead ? "bg-white" : "bg-amber-50/50 border-amber-200"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={`text-[10px] border-0 ${
                          TYPE_COLORS[n.type] ?? TYPE_COLORS.system_alert
                        }`}
                      >
                        {n.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-neutral-400">
                        {timeAgo(n.createdAt)}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                        title="Mark read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif.mutate(n.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
