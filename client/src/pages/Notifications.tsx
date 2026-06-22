import { useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { notificationsApi, type Notification } from "@/lib/api";
import Layout from "@/components/Layout";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    notificationsApi
      .list({ limit: 50 })
      .then((r) => {
        setNotifications(r.items);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleMarkRead = async (id: number) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {unread} unread
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border transition-colors ${
                  n.read
                    ? "bg-white border-neutral-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!n.read ? "text-neutral-900" : "text-neutral-700"}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(n.createdAt).toLocaleString("en-SA")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.actionUrl && (
                      <Link href={n.actionUrl}>
                        <a className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-amber-600">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > notifications.length && (
          <p className="text-center text-sm text-neutral-500 mt-4">
            Showing {notifications.length} of {total} notifications
          </p>
        )}
      </div>
    </Layout>
  );
}
