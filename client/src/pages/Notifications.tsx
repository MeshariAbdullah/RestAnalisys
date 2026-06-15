import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import { Bell, CheckCheck, Clock } from "lucide-react";

function typeColor(type: string): string {
  if (type.includes("confirmed") || type.includes("approved") || type.includes("captured")) return "bg-green-100 text-green-800";
  if (type.includes("rejected") || type.includes("blocked") || type.includes("late")) return "bg-red-100 text-red-800";
  if (type.includes("dispute") || type.includes("refund")) return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = notifications.filter((n) => n.status === "pending");

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread.length > 0 && (
              <Badge variant="destructive">{unread.length} unread</Badge>
            )}
          </div>
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: Notification) => (
              <Card
                key={n.id}
                className={n.status === "pending" ? "border-l-4 border-l-amber-400 bg-amber-50/50" : "opacity-75"}
              >
                <CardContent className="py-3 px-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(n.type)}`}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-neutral-600">{n.body}</p>
                  </div>
                  {n.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(n.id)}
                      disabled={markRead.isPending}
                      className="shrink-0"
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
