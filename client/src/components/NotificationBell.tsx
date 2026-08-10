import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type AppNotification } from "../lib/api";
import { Bell, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: countData } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: items } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsApi.list(20),
    enabled: open,
  });

  const readMut = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const readAllMut = useMutation({
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <button
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => readAllMut.mutate()}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {(!items || items.length === 0) && (
              <p className="p-4 text-sm text-neutral-400 text-center">
                No notifications yet.
              </p>
            )}
            {items?.map((n: AppNotification) => (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-neutral-50 transition-colors",
                  !n.read && "bg-blue-50/50"
                )}
                onClick={() => {
                  if (!n.read) readMut.mutate(n.id);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !n.read && "font-medium")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
