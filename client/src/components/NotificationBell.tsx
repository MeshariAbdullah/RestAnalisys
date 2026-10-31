import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsApi.list(20),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const count = countData?.count ?? 0;

  function handleItemClick(n: Notification) {
    if (!n.read) markRead.mutate(n.id);
    if (n.linkUrl) {
      setOpen(false);
      navigate(n.linkUrl);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        {count > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-400">
                No notifications yet
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors flex gap-3",
                    !n.read && "bg-amber-50/50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {n.title}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {n.linkUrl && (
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-300 shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
