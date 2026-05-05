import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type AppNotification } from "../lib/api";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeIcon(type: string): string {
  if (type.startsWith("rental")) return "📋";
  if (type.startsWith("asset")) return "💎";
  if (type.startsWith("payment") || type.startsWith("payout")) return "💰";
  if (type.startsWith("dispute")) return "⚖️";
  if (type.startsWith("inspection")) return "🔍";
  if (type.startsWith("legal")) return "📄";
  if (type.startsWith("penalty")) return "⚠️";
  if (type.startsWith("review")) return "⭐";
  return "🔔";
}

export default function Notifications() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(100),
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

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading && <p className="text-gray-500">Loading...</p>}

        {!isLoading && items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No notifications yet
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-colors ${
                n.read ? "bg-white" : "bg-blue-50 border-blue-200"
              }`}
              onClick={() => {
                if (!n.read) markRead.mutate(n.id);
              }}
            >
              <CardContent className="py-4 flex items-start gap-3">
                <span className="text-xl mt-0.5">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    {!n.read && (
                      <Badge variant="default" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
