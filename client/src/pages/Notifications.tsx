import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Package,
  FileText,
  AlertTriangle,
  CreditCard,
  Gavel,
  Shield,
} from "lucide-react";

function typeIcon(type: string) {
  if (type.startsWith("rental_")) return <ShoppingBag className="w-5 h-5" />;
  if (type.startsWith("asset_")) return <Package className="w-5 h-5" />;
  if (type.startsWith("payment_") || type === "payout_released")
    return <CreditCard className="w-5 h-5" />;
  if (type.startsWith("dispute_")) return <Gavel className="w-5 h-5" />;
  if (type.startsWith("sanad_")) return <FileText className="w-5 h-5" />;
  if (type === "alert") return <AlertTriangle className="w-5 h-5" />;
  return <Shield className="w-5 h-5" />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-SA");
}

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi
      .list(100)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkRead(id: number) {
    await notificationsApi.markRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`transition-colors cursor-pointer ${
                  n.read ? "opacity-70" : "border-l-4 border-l-amber-500"
                }`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <CardContent className="py-4 flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      n.read
                        ? "bg-neutral-100 text-neutral-400"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${n.read ? "" : "text-neutral-900"}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-neutral-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
