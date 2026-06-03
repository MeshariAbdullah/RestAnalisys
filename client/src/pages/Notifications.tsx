import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { notificationsApi } from "@/lib/api";

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list({ limit: 100 }),
  });

  const markRead = useMutation({
    mutationFn: (ids?: number[]) => notificationsApi.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => notificationsApi.preferences(),
  });

  const updatePrefs = useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500" />
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-neutral-500">
                {data?.unreadCount ? `${data.unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          {data && data.unreadCount > 0 && (
            <button
              onClick={() => markRead.mutate()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Preferences */}
        {!prefsLoading && prefs && (
          <Card className="mb-8">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-neutral-500" />
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={prefs.smsEnabled}
                    onChange={(e) => updatePrefs.mutate({ smsEnabled: e.target.checked })}
                    className="rounded"
                  />
                  SMS
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={prefs.emailEnabled}
                    onChange={(e) => updatePrefs.mutate({ emailEnabled: e.target.checked })}
                    className="rounded"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={prefs.pushEnabled}
                    onChange={(e) => updatePrefs.mutate({ pushEnabled: e.target.checked })}
                    className="rounded"
                  />
                  Push
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification list */}
        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-lg font-medium text-neutral-400">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.items.map((n) => (
              <Card
                key={n.id}
                className={`transition-colors ${
                  !n.readAt ? "bg-amber-50/50 border-amber-200" : ""
                }`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      !n.readAt ? "bg-amber-500" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    {n.subject && (
                      <p className="text-sm font-semibold mb-0.5">{n.subject}</p>
                    )}
                    <p className="text-sm text-neutral-700">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                      <span className="uppercase">{n.channel}</span>
                      <span>{n.category.replace(/_/g, " ")}</span>
                      <span>{new Date(n.createdAt).toLocaleString("en-SA")}</span>
                    </div>
                  </div>
                  {!n.readAt && (
                    <button
                      onClick={() => markRead.mutate([n.id])}
                      className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
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
