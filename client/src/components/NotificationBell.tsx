import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api";

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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });

  const { data: items } = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    enabled: open,
  });

  const unread = countData?.count ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
    qc.invalidateQueries({ queryKey: ["notifications-recent"] });
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
    qc.invalidateQueries({ queryKey: ["notifications-recent"] });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-white"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!items || items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-500">
                No notifications yet
              </div>
            ) : (
              items.map((n: Notification) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`px-4 py-3 border-b border-neutral-800/50 cursor-pointer hover:bg-neutral-900 transition-colors ${
                    !n.read ? "bg-amber-500/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-neutral-800">
            <a
              href="/notifications"
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
