import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isAuthenticated } from "@/lib/auth";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function notificationIcon(type: string): string {
  switch (type) {
    case "rental_status": return "📋";
    case "asset_status": return "💎";
    case "payment": return "💳";
    case "legal": return "📜";
    case "dispute": return "⚖️";
    case "inspection": return "🔍";
    case "shipment": return "🚛";
    case "system": return "⚙️";
    case "alert": return "🔔";
    default: return "📌";
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchUnreadCount() {
    try {
      const { unreadCount: count } = await notificationsApi.unreadCount();
      setUnreadCount(count);
    } catch { /* ignore */ }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const { items, unreadCount: count } = await notificationsApi.list({ limit: 15 });
      setNotifications(items);
      setUnreadCount(count);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function togglePanel() {
    if (!open) fetchNotifications();
    setOpen(!open);
  }

  async function handleMarkRead(id: number) {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={togglePanel}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer",
                    !n.read && "bg-amber-50/50"
                  )}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <span className="text-lg shrink-0 mt-0.5">{notificationIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-neutral-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="shrink-0 mt-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-neutral-100 text-center">
              <span className="text-xs text-neutral-400">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
