import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Package,
  CreditCard,
  Diamond,
  ClipboardCheck,
  FileSignature,
  Gavel,
  Truck,
  Settings,
} from "lucide-react";
import { notificationsApi } from "@/lib/api";
import type { AppNotification } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  rental: { icon: Package, color: "text-blue-400", bg: "bg-blue-500/10", label: "Rental" },
  payment: { icon: CreditCard, color: "text-green-400", bg: "bg-green-500/10", label: "Payment" },
  asset: { icon: Diamond, color: "text-amber-400", bg: "bg-amber-500/10", label: "Asset" },
  inspection: { icon: ClipboardCheck, color: "text-purple-400", bg: "bg-purple-500/10", label: "Inspection" },
  legal: { icon: FileSignature, color: "text-red-400", bg: "bg-red-500/10", label: "Legal" },
  dispute: { icon: Gavel, color: "text-orange-400", bg: "bg-orange-500/10", label: "Dispute" },
  shipment: { icon: Truck, color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Shipment" },
  system: { icon: Settings, color: "text-neutral-400", bg: "bg-neutral-500/10", label: "System" },
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export default function Notifications() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await notificationsApi.list(100);
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  async function handleMarkRead(id: number) {
    await notificationsApi.markRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function handleClick(n: AppNotification) {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.actionUrl) setLocation(n.actionUrl);
  }

  const filtered =
    filter === "all"
      ? items
      : filter === "unread"
        ? items.filter((n) => !n.isRead)
        : items.filter((n) => n.category === filter);

  const categories = [...new Set(items.map((n) => n.category))];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "unread", ...categories].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
              filter === f
                ? "bg-amber-500 text-neutral-950"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-neutral-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-neutral-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = CATEGORY_META[n.category] ?? CATEGORY_META.system;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                  n.isRead
                    ? "bg-white border-neutral-200 hover:border-neutral-300"
                    : "bg-amber-50 border-amber-200 hover:border-amber-300 shadow-sm"
                )}
              >
                <div className={cn("shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", meta.bg)}>
                  <Icon className={cn("w-5 h-5", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm", n.isRead ? "text-neutral-600" : "text-neutral-900 font-semibold")}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                          className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {n.actionUrl && <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />}
                    </div>
                  </div>
                  <p className={cn("text-sm mt-1", n.isRead ? "text-neutral-400" : "text-neutral-600")}>
                    {n.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium uppercase", meta.bg, meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDate(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
