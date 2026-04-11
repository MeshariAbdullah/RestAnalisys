import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type NotificationItem } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Top-right notification bell. Polls unread count every 30s and opens a
 * lightweight dropdown listing the most recent 20 items.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "list", { limit: 20 }],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    enabled: open,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function markAllRead() {
    await notificationsApi.markAllRead();
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markOneRead(id: number) {
    await notificationsApi.markRead([id]);
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const unread = unreadQuery.data?.count ?? 0;
  const items: NotificationItem[] = listQuery.data ?? [];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-neutral-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-96 max-h-[32rem] overflow-hidden rounded-xl bg-white border border-neutral-200 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-semibold text-sm">Notifications</p>
            {items.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-amber-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-96">
            {listQuery.isLoading && (
              <div className="p-6 text-center text-sm text-neutral-500">
                Loading…
              </div>
            )}
            {!listQuery.isLoading && items.length === 0 && (
              <div className="p-8 text-center text-sm text-neutral-500">
                You're all caught up.
              </div>
            )}
            {items.map((n) => {
              const isUnread = !n.readAt;
              const body = (
                <div
                  className={cn(
                    "px-4 py-3 border-b last:border-b-0 flex gap-3 hover:bg-neutral-50 cursor-pointer",
                    isUnread && "bg-amber-50/40"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      isUnread ? "bg-amber-500" : "bg-transparent"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 line-clamp-1">
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-600 line-clamp-2 mt-0.5">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markOneRead(n.id);
                      }}
                      className="text-neutral-400 hover:text-amber-600 shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
              return n.linkPath ? (
                <Link key={n.id} href={n.linkPath}>
                  <a onClick={() => setOpen(false)}>{body}</a>
                </Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
