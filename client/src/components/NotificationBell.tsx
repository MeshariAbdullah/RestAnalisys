import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { isAuthenticated } from "@/lib/auth";

export default function NotificationBell({ compact }: { compact?: boolean }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(20),
    enabled: isAuthenticated(),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
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

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  function title(n: AppNotification) {
    return locale === "ar" ? n.titleAr : n.titleEn;
  }
  function body(n: AppNotification) {
    return locale === "ar" ? n.bodyAr : n.bodyEn;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-neutral-800 text-neutral-300 hover:text-white"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {!compact && (
          <span>{locale === "ar" ? "الإشعارات" : "Notifications"}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 end-0 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-neutral-800">
            <span className="text-sm font-medium text-white">
              {locale === "ar" ? "الإشعارات" : "Notifications"}
            </span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                {locale === "ar" ? "قراءة الكل" : "Mark all read"}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 text-sm">
                {locale === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors ${
                    !n.read ? "bg-amber-500/5" : ""
                  }`}
                  onClick={() => {
                    if (!n.read) markRead.mutate(n.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? "font-medium text-white" : "text-neutral-300"}`}>
                        {title(n)}
                      </p>
                      {body(n) && (
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                          {body(n)}
                        </p>
                      )}
                      <p className="text-[10px] text-neutral-600 mt-1">
                        {new Date(n.createdAt).toLocaleDateString(
                          locale === "ar" ? "ar-SA" : "en-US",
                          { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 bg-amber-400 rounded-full shrink-0 mt-1.5" />
                    )}
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
