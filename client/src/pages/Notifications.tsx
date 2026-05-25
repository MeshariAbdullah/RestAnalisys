import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import Layout from "@/components/Layout";

function typeColor(type: string): string {
  if (type.startsWith("rental_")) return "bg-blue-100 text-blue-700";
  if (type.startsWith("asset_")) return "bg-green-100 text-green-700";
  if (type.startsWith("payment_") || type.startsWith("payout_")) return "bg-amber-100 text-amber-700";
  if (type.startsWith("dispute_")) return "bg-red-100 text-red-700";
  if (type.startsWith("sanad_")) return "bg-purple-100 text-purple-700";
  return "bg-neutral-100 text-neutral-700";
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => notificationsApi.list({ limit: 100 }),
  });

  async function handleMarkRead(id: number) {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  }

  const items = data?.items ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Bell className="w-6 h-6" />
              Notifications
            </h1>
            <p className="text-neutral-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-neutral-400">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`transition-colors ${!n.read ? "border-amber-200 bg-amber-50/30" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {!n.read && (
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.read ? "ml-[22px]" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={typeColor(n.type)}>
                          {formatType(n.type)}
                        </Badge>
                        <span className="text-xs text-neutral-400">
                          {new Date(n.createdAt).toLocaleString("en-SA")}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-neutral-500 mt-0.5">{n.message}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
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
