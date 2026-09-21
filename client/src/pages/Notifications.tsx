import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationsApi, type Notification } from "@/lib/api";
import Layout from "@/components/Layout";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  asset_approved: "Asset",
  asset_rejected: "Asset",
  asset_inspection_complete: "Inspection",
  asset_listed: "Asset",
  rental_created: "Rental",
  rental_confirmed: "Rental",
  rental_delivered: "Delivery",
  rental_returned: "Return",
  rental_closed: "Rental",
  rental_cancelled: "Rental",
  payment_captured: "Payment",
  payment_refunded: "Refund",
  payout_released: "Payout",
  dispute_opened: "Dispute",
  dispute_resolved: "Dispute",
  system: "System",
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => notificationsApi.list({ limit: 100 }),
  });

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications-all"] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  const unreadCount = items?.filter((n) => !n.read).length ?? 0;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-amber-500 text-neutral-950">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading && <div className="text-neutral-500">Loading...</div>}

        {!isLoading && (!items || items.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center text-neutral-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-lg font-medium mb-1">No notifications</p>
              <p className="text-sm">
                You'll see notifications here when there are updates to your
                assets, rentals, or account.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {items?.map((n: Notification) => (
            <Card
              key={n.id}
              className={`transition-colors ${!n.read ? "border-amber-500/30 bg-amber-50/5" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                {!n.read && (
                  <span className="mt-2 w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600">{n.message}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead(n.id)}
                    className="shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
