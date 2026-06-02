import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notificationsApi, type NotificationItem } from "@/lib/api";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(50),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  function handleClick(notif: NotificationItem) {
    if (!notif.read) markReadMutation.mutate(notif.id);
    if (notif.linkUrl) navigate(notif.linkUrl);
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                notif.read ? "opacity-70" : "border-l-4 border-l-amber-500"
              }`}
              onClick={() => handleClick(notif)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    notif.read ? "bg-transparent" : "bg-amber-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.read ? "" : "font-semibold"}`}>
                    {notif.title}
                  </p>
                  <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>
                {!notif.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(notif.id);
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
