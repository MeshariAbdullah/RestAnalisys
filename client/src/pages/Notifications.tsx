import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    await qc.invalidateQueries({ queryKey: ["notifications"] });
    await qc.invalidateQueries({ queryKey: ["unread-count"] });
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    await qc.invalidateQueries({ queryKey: ["notifications"] });
    await qc.invalidateQueries({ queryKey: ["unread-count"] });
  }

  const items = data?.items ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-neutral-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n: Notification) => (
            <Card
              key={n.id}
              className={cn(
                "transition-colors",
                !n.read && "border-amber-200 bg-amber-50/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5",
                      !n.read
                        ? "bg-amber-100 text-amber-600"
                        : "bg-neutral-100 text-neutral-400"
                    )}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold", !n.read && "text-amber-900")}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-neutral-400">
                        {timeAgo(n.createdAt)}
                      </span>
                      {n.actionUrl && (
                        <Link href={n.actionUrl}>
                          <a className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-neutral-500 hover:text-neutral-700 shrink-0"
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
