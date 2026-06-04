import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import { useLocation } from "wouter";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-SA");
}

function typeColor(type: string): string {
  if (type.includes("delivered") || type.includes("confirmed") || type.includes("closed"))
    return "bg-green-100 text-green-700";
  if (type.includes("cancelled") || type.includes("rejected") || type.includes("dispute"))
    return "bg-red-100 text-red-700";
  if (type.includes("payment") || type.includes("payout"))
    return "bg-blue-100 text-blue-700";
  if (type.includes("risk") || type.includes("sanad"))
    return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(100),
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationsApi.unreadCount(),
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  function handleClick(n: Notification) {
    if (!n.read) markReadMut.mutate(n.id);
    if (n.relatedEntityType === "rental") {
      navigate(`/my-rentals`);
    }
  }

  const unreadCount = unreadData?.count ?? 0;

  return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading && (
          <p className="text-neutral-500 text-center py-12">Loading...</p>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="text-center py-16 text-neutral-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications?.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !n.read ? "border-l-4 border-l-amber-500 bg-amber-50/30" : ""
              }`}
              onClick={() => handleClick(n)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={typeColor(n.type)} variant="secondary">
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                    {!n.read && (
                      <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                    <Clock className="w-3 h-3" />
                    {timeAgo(n.createdAt)}
                    {n.relatedEntityType && (
                      <span className="flex items-center gap-1 ml-2">
                        <ExternalLink className="w-3 h-3" />
                        View {n.relatedEntityType}
                      </span>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMut.mutate(n.id);
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  );
}
