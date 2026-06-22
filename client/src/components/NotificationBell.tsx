import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      notificationsApi.unreadCount().then((r) => setCount(r.unreadCount)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <Link href="/notifications">
      <a className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors" title="Notifications">
        <Bell className="w-5 h-5 text-neutral-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </a>
    </Link>
  );
}
