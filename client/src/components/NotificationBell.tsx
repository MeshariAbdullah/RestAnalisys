import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type Notification } from "../lib/api";
import { Bell, CheckCheck } from "lucide-react";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });

  const { data: notifData, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    enabled: open,
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const count = countData?.count ?? 0;
  const items = notifData?.items ?? [];

  const typeIcon: Record<string, string> = {
    rental_status_change: "📦",
    asset_status_change: "✨",
    payment_received: "💳",
    dispute_update: "⚖️",
    payout_released: "💰",
    system_alert: "🔔",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-neutral-300" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-neutral-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h3 className="font-semibold text-sm text-neutral-900">Notifications</h3>
            {count > 0 && (
              <button
                onClick={() => markAllMut.mutate()}
                className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-neutral-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">No notifications</div>
          ) : (
            <ul>
              {items.map((n: Notification) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50 ${
                    !n.isRead ? "bg-amber-50/50" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) markReadMut.mutate(n.id);
                  }}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {typeIcon[n.type] || "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? "font-semibold" : ""} text-neutral-900`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
