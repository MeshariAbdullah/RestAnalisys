import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const countQuery = useQuery({
    queryKey: ["notification-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });

  const listQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(20),
    enabled: open,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = countQuery.data?.count ?? 0;

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ["notification-count"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ["notification-count"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-semibold text-neutral-900 text-sm">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-amber-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {listQuery.isLoading ? (
              <p className="p-4 text-sm text-neutral-500">Loading…</p>
            ) : !listQuery.data || listQuery.data.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500 text-center">
                No notifications yet.
              </p>
            ) : (
              listQuery.data.map((n: AppNotification) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b last:border-0 text-sm cursor-pointer hover:bg-neutral-50 transition-colors",
                    !n.read && "bg-amber-50/50"
                  )}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    if (n.link) {
                      setOpen(false);
                      window.location.href = n.link;
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-1.5" />
                    )}
                    <div className={cn(!n.read ? "" : "pl-4")}>
                      <p className="font-medium text-neutral-900">{n.title}</p>
                      <p className="text-neutral-600 text-xs mt-0.5">{n.body}</p>
                      <p className="text-neutral-400 text-[11px] mt-1">
                        {new Date(n.createdAt).toLocaleDateString("en-SA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
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
