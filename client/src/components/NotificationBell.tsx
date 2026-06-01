import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-SA");
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const count = countData?.count ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-amber-500 text-neutral-950 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
              <p className="text-sm font-semibold text-white">Notifications</p>
              {count > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {(!notifications || notifications.length === 0) ? (
                <div className="p-6 text-center text-neutral-500 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "p-3 border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors cursor-pointer",
                      !n.isRead && "bg-amber-500/5 border-l-2 border-l-amber-500"
                    )}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", !n.isRead ? "text-white font-medium" : "text-neutral-300")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1">{timeAgo(n.createdAt)}</p>
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
