import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { notificationsApi, type Notification } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function typeIcon(type: string) {
  const map: Record<string, string> = {
    rental_created: "New rental for your asset",
    rental_delivered: "Delivery confirmed",
    rental_closed: "Rental closed",
    asset_approved: "Asset approved",
    asset_rejected: "Asset rejected",
    asset_listed: "Asset is live",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

export default function Notifications() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(50),
  });

  async function markRead(n: Notification) {
    if (!n.read) {
      await notificationsApi.markRead(n.id);
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.linkTo) navigate(n.linkTo);
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="w-8 h-8" /> Notifications
            </h1>
            {unread > 0 && (
              <p className="text-neutral-500 mt-1">{unread} unread</p>
            )}
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-neutral-500">
              <Bell className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                  !n.read ? "border-amber-300 bg-amber-50/30" : ""
                }`}
                onClick={() => markRead(n)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    n.read ? "bg-transparent" : "bg-amber-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {typeIcon(n.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-neutral-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {n.linkTo && (
                    <ExternalLink className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
