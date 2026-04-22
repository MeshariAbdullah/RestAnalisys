import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => notificationsApi.list(20),
    enabled: open,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const unread = countData?.count ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-neutral-50">
              <span className="text-sm font-semibold text-neutral-900">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-amber-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {!notifications || notifications.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n: AppNotification) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer",
                      !n.read && "bg-amber-50/50"
                    )}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", !n.read ? "font-semibold text-neutral-900" : "text-neutral-700")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
