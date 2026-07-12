import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notificationsApi, type AppNotification } from "@/lib/api";

export default function Notifications() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread-notifications"] });
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread-notifications"] });
  }

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
  }

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-neutral-700" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !notifications?.length ? (
        <div className="text-center py-20 text-neutral-500">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-colors ${
                n.read ? "opacity-70" : "border-amber-200 bg-amber-50/30"
              }`}
              onClick={() => handleClick(n)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 mt-0.5 line-clamp-2">
                    {n.body}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("en-SA", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }}
                    className="p-1 rounded hover:bg-neutral-200 text-neutral-400"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
