import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { notificationsApi, type NotificationItem } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notificationHref(n: NotificationItem, isAdmin: boolean): string | null {
  const t = n.type.toLowerCase();
  if (t.includes("rental")) return isAdmin ? "/admin" : "/my-rentals";
  if (t.includes("asset")) return isAdmin ? "/admin/approvals" : "/owner";
  if (t.includes("dispute")) return "/admin/disputes";
  if (t.includes("payout")) return "/owner/payouts";
  if (t.includes("inspection")) return isAdmin ? "/admin/approvals" : "/inspector";
  if (t.includes("shipment")) return "/ops/shipments";
  return null;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data: countData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: notificationsApi.list,
    enabled: open,
  });

  const markReadMut = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unread = countData?.count ?? 0;

  function handleNotificationClick(n: NotificationItem) {
    if (!n.isRead) markReadMut.mutate(n.id);
    const href = notificationHref(n, isAdmin);
    if (href) navigate(href);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 sm:w-80 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:w-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => markAllMut.mutate()}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                disabled={markAllMut.isPending}
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {!notifications || notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              No notifications yet
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex gap-3 items-start border-b border-neutral-800/50 last:border-0"
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        n.isRead ? "bg-neutral-700" : "bg-amber-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
