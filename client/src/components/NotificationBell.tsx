import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import type { AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  rental: "bg-blue-500",
  payment: "bg-green-500",
  asset: "bg-amber-500",
  inspection: "bg-purple-500",
  legal: "bg-red-500",
  dispute: "bg-orange-500",
  shipment: "bg-cyan-500",
  system: "bg-neutral-500",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-SA", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(pollUnread, 30000);
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

  async function loadNotifications() {
    try {
      const res = await notificationsApi.list(20);
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      /* ignore */
    }
  }

  async function pollUnread() {
    try {
      const res = await notificationsApi.unreadCount();
      setUnreadCount(res.count);
    } catch {
      /* ignore */
    }
  }

  async function handleMarkRead(id: number) {
    await notificationsApi.markRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  }

  function handleNavigate(n: AppNotification) {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.actionUrl) {
      setLocation(n.actionUrl);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-white"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[28rem] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-sm">
                No notifications yet
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNavigate(n)}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-neutral-800 cursor-pointer transition-colors",
                    n.isRead
                      ? "hover:bg-neutral-800/50"
                      : "bg-neutral-800/40 hover:bg-neutral-800"
                  )}
                >
                  <div className="mt-1 shrink-0">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        n.isRead ? "bg-neutral-600" : CATEGORY_COLORS[n.category] ?? "bg-neutral-500"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm truncate", n.isRead ? "text-neutral-400" : "text-white font-medium")}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                          className="shrink-0 p-0.5 rounded hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className={cn("text-xs mt-0.5 line-clamp-2", n.isRead ? "text-neutral-500" : "text-neutral-300")}>
                      {n.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-neutral-500">{timeAgo(n.createdAt)}</span>
                      {n.actionUrl && (
                        <ExternalLink className="w-3 h-3 text-neutral-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-neutral-700 px-4 py-2">
              <button
                onClick={() => {
                  setLocation("/notifications");
                  setOpen(false);
                }}
                className="w-full text-xs text-center text-amber-400 hover:text-amber-300 py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
