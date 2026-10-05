import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notificationsApi, type AppNotification } from "@/lib/api";

export default function Notifications() {
  const [, navigate] = useLocation();
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

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (n.linkUrl) navigate(n.linkUrl);
  }

  const unreadCount = (data ?? []).filter((n) => !n.read).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-neutral-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                !n.read ? "border-l-4 border-l-amber-500" : ""
              }`}
              onClick={() => handleClick(n)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? "font-semibold" : "text-neutral-700"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
