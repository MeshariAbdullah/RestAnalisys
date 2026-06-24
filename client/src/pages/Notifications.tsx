import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { notificationsApi, type Notification } from "@/lib/api";
import { Bell, CheckCheck, Eye } from "lucide-react";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.list().then((data) => {
      setItems(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleMarkRead(id: number) {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  const typeColors: Record<string, string> = {
    rental_created: "bg-blue-100 text-blue-800",
    asset_approved: "bg-green-100 text-green-800",
    payment_received: "bg-emerald-100 text-emerald-800",
    inspection_complete: "bg-purple-100 text-purple-800",
    dispute_opened: "bg-red-100 text-red-800",
    sanad_issued: "bg-amber-100 text-amber-800",
    late_return_warning: "bg-orange-100 text-orange-800",
    system: "bg-neutral-100 text-neutral-800",
  };

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-neutral-500 text-center py-12">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-neutral-500 text-center py-12">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border transition-colors ${
                  n.isRead
                    ? "bg-white border-neutral-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          typeColors[n.type] ?? "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {n.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-neutral-600 mt-0.5">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                      title="Mark as read"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
