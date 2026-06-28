import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const [, navigate] = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    notificationsApi.unreadCount().then((r) => setUnread(r.unread)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.unreadCount().then((r) => setUnread(r.unread)).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function toggleDropdown() {
    if (!open) {
      const data = await notificationsApi.list().catch(() => []);
      setItems(data);
    }
    setOpen(!open);
  }

  async function handleClick(n: AppNotification) {
    if (!n.read) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setUnread((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    setOpen(false);
    if (n.linkUrl) navigate(n.linkUrl);
  }

  async function markAllRead() {
    await notificationsApi.markAllRead().catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const categoryColors: Record<string, string> = {
    rental: "bg-blue-500",
    payment: "bg-green-500",
    dispute: "bg-red-500",
    legal: "bg-amber-500",
    asset: "bg-purple-500",
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-neutral-50">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-neutral-400">No notifications yet</p>
              ) : (
                items.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors flex gap-3",
                      !n.read && "bg-amber-50/60"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        n.read ? "bg-transparent" : (categoryColors[n.category] ?? "bg-neutral-400")
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
