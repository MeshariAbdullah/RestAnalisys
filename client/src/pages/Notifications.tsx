import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  Info,
  Gavel,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notificationsApi, type Notification } from "@/lib/api";
import Layout from "@/components/Layout";

const TYPE_META: Record<
  string,
  { icon: typeof Bell; color: string; label: string }
> = {
  rental_status: {
    icon: FileText,
    color: "text-blue-600",
    label: "Rental",
  },
  payment: {
    icon: CreditCard,
    color: "text-green-600",
    label: "Payment",
  },
  dispute: {
    icon: Gavel,
    color: "text-red-600",
    label: "Dispute",
  },
  alert: {
    icon: AlertTriangle,
    color: "text-amber-600",
    label: "Alert",
  },
  system: {
    icon: Info,
    color: "text-neutral-600",
    label: "System",
  },
};

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list({ limit: 100 }),
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationsApi.unreadCount(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="w-7 h-7" /> Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white ml-2">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-neutral-500 mt-1">
              Stay up to date with your rentals, payments, and alerts.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-neutral-400 text-center py-16">Loading...</div>
        ) : !notifications?.length ? (
          <div className="text-neutral-400 text-center py-16">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={() => markReadMutation.mutate(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function NotificationRow({
  notification: n,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.system;
  const Icon = meta.icon;

  return (
    <Card
      className={`transition-colors ${
        !n.read ? "bg-amber-50/50 border-amber-200" : ""
      }`}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`mt-0.5 ${meta.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm">{n.title}</span>
            <Badge variant="outline" className="text-[10px] px-1.5">
              {meta.label}
            </Badge>
            {!n.read && (
              <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
            )}
          </div>
          <p className="text-sm text-neutral-600">{n.message}</p>
          <p className="text-xs text-neutral-400 mt-1">
            {new Date(n.createdAt).toLocaleString()}
          </p>
        </div>
        {!n.read && (
          <button
            onClick={onMarkRead}
            className="text-xs text-amber-600 hover:underline shrink-0 mt-1"
          >
            Mark read
          </button>
        )}
      </CardContent>
    </Card>
  );
}
