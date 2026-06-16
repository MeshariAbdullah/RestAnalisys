import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  asset_approved: "bg-green-100 text-green-800",
  asset_rejected: "bg-red-100 text-red-800",
  asset_listed: "bg-blue-100 text-blue-800",
  rental_created: "bg-amber-100 text-amber-800",
  rental_delivered: "bg-emerald-100 text-emerald-800",
  rental_closed: "bg-neutral-100 text-neutral-800",
  dispute_opened: "bg-orange-100 text-orange-800",
  payment_captured: "bg-green-100 text-green-800",
};

function categoryLabel(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-SA");
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  async function load() {
    try {
      const data = await notificationsApi.list({ limit: 100 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-neutral-400">Loading...</div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-400">No notifications yet</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`
                flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
                ${
                  n.read
                    ? "bg-white border-neutral-100 hover:border-neutral-200"
                    : "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                }
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      CATEGORY_COLORS[n.category] ?? "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {categoryLabel(n.category)}
                  </span>
                  <span className="text-xs text-neutral-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className={`text-sm ${n.read ? "text-neutral-700" : "text-neutral-900 font-medium"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-1">
                {n.actionUrl && (
                  <ExternalLink className="w-4 h-4 text-neutral-300" />
                )}
                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead(n.id);
                    }}
                    className="p-1 rounded hover:bg-amber-100 text-amber-500"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
