import { useEffect, useState } from "react";
import { notificationsApi, type Notification, type PaginatedResponse } from "../lib/api";

export default function Notifications() {
  const [data, setData] = useState<PaginatedResponse<Notification> | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.list({
        page,
        limit: 20,
        unread: filter === "unread",
      });
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const handleMarkRead = async (id: number) => {
    await notificationsApi.markRead(id);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    fetchNotifications();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-SA", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setFilter("all"); setPage(1); }}
          className={`px-3 py-1 rounded text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          All
        </button>
        <button
          onClick={() => { setFilter("unread"); setPage(1); }}
          className={`px-3 py-1 rounded text-sm ${filter === "unread" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          Unread
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg border ${
                notif.read ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                    <p className="font-medium text-sm">{notif.title}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                      {formatTime(notif.createdAt)}
                    </span>
                    {notif.entityType && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {notif.entityType}
                      </span>
                    )}
                  </div>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 ml-4"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPrev}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.pagination.hasNext}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {filter === "unread" ? "No unread notifications" : "No notifications yet"}
        </div>
      )}
    </div>
  );
}
