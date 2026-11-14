import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link } from "wouter";
import { notificationsApi } from "@/lib/api";

export default function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });

  const count = data?.count ?? 0;

  return (
    <Link href="/notifications">
      <a className="relative inline-flex items-center p-2 rounded-md hover:bg-neutral-100 transition-colors">
        <Bell className="w-5 h-5 text-neutral-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </a>
    </Link>
  );
}
