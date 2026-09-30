import React, { useEffect, useState } from "react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await notificationsApi.list(50);
      setNotifications(res.items);
      setUnread(res.unread);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnread((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
    setUnread(0);
  }

  const categoryColors: Record<string, string> = {
    rental: "bg-blue-100 text-blue-800",
    asset: "bg-purple-100 text-purple-800",
    payment: "bg-green-100 text-green-800",
    legal: "bg-amber-100 text-amber-800",
    system: "bg-neutral-100 text-neutral-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
          {unread > 0 && (
            <Badge variant="destructive" className="text-xs">{unread}</Badge>
          )}
        </h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="flex items-center gap-1">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "transition-colors cursor-pointer",
                !n.readAt && "border-l-4 border-l-amber-500 bg-amber-50/30"
              )}
              onClick={() => !n.readAt && markRead(n.id)}
            >
              <CardContent className="py-3 px-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{n.title}</span>
                    <Badge variant="outline" className={cn("text-[10px]", categoryColors[n.category] ?? "")}>
                      {n.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600">{n.body}</p>
                  <p className="text-xs text-neutral-400 mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {!n.readAt ? (
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-neutral-300 mt-1 shrink-0" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
