import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const remove = useMutation({
    mutationFn: notificationsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unread = countData?.unread ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-200 z-50 max-h-[28rem] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                  disabled={markAllRead.isPending}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-neutral-400 text-sm">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 text-sm">
                No notifications yet.
              </div>
            ) : (
              items.map((n: AppNotification) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors group",
                    !n.read && "bg-amber-50/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-1.5 w-2 h-2 rounded-full shrink-0",
                      n.read ? "bg-transparent" : "bg-amber-500"
                    )}
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                    }}
                  >
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="p-1 rounded hover:bg-neutral-200 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                    )}
                    <button
                      onClick={() => remove.mutate(n.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
