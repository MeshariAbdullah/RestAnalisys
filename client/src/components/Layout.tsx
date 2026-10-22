import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  PackageSearch,
  FileText,
  Shield,
  Truck,
  Gavel,
  ClipboardCheck,
  Receipt,
  AlertTriangle,
  Users as UsersIcon,
  LogOut,
  Menu,
  X,
  Diamond,
  Wallet,
  FileSignature,
  Bell,
  ScrollText,
} from "lucide-react";
import type { Role, User } from "@/lib/api";
import { notificationsApi, type AppNotification } from "@/lib/api";
import { clearSession, getCurrentUser, isAuthenticated } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  // Renter
  { href: "/browse", label: "Browse Catalog", icon: ShoppingBag, roles: ["renter"] },
  { href: "/my-rentals", label: "My Rentals", icon: FileText, roles: ["renter"] },

  // Owner
  { href: "/owner", label: "Owner Dashboard", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/owner/submit", label: "Submit Asset", icon: Diamond, roles: ["owner"] },
  { href: "/owner/payouts", label: "Payouts", icon: Wallet, roles: ["owner"] },

  // Inspector
  { href: "/inspector", label: "Inspection Queue", icon: ClipboardCheck, roles: ["inspector"] },

  // Operations
  { href: "/ops", label: "Ops Dashboard", icon: LayoutDashboard, roles: ["operations"] },
  { href: "/ops/shipments", label: "Shipments", icon: Truck, roles: ["operations"] },
  { href: "/ops/inventory", label: "Inventory", icon: PackageSearch, roles: ["operations"] },
  { href: "/ops/alerts", label: "Alerts", icon: AlertTriangle, roles: ["operations"] },

  // Admin
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, roles: ["admin", "super_admin"] },
  { href: "/admin/approvals", label: "Asset Approvals", icon: ClipboardCheck, roles: ["admin", "super_admin"] },
  { href: "/admin/users", label: "Users", icon: UsersIcon, roles: ["admin", "super_admin"] },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel, roles: ["admin", "super_admin"] },
  { href: "/admin/sanad", label: "Sanad Tracking", icon: FileSignature, roles: ["admin", "super_admin"] },
  { href: "/admin/finance", label: "Financial Overview", icon: Receipt, roles: ["admin", "super_admin"] },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText, roles: ["admin", "super_admin"] },
];

function roleLabel(role: Role): string {
  return {
    renter: "Renter",
    owner: "Asset Owner",
    inspector: "Inspector",
    operations: "Operations",
    admin: "Admin",
    super_admin: "Super Admin",
  }[role];
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    enabled: isAuthenticated(),
  });

  const { data: listData } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => notificationsApi.list({ limit: 8 }),
    enabled: open && isAuthenticated(),
  });

  const unread = data?.count ?? 0;

  async function markAllRead() {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
    qc.invalidateQueries({ queryKey: ["notifications-list"] });
  }

  async function markRead(id: number) {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
    qc.invalidateQueries({ queryKey: ["notifications-list"] });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-neutral-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-[10px] font-bold text-neutral-950 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-amber-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
              {(listData?.items ?? []).length === 0 ? (
                <p className="text-center text-sm text-neutral-400 py-8">
                  No notifications yet
                </p>
              ) : (
                (listData?.items ?? []).map((n: AppNotification) => (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors",
                      !n.read && "bg-amber-50/60"
                    )}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.linkUrl) window.location.href = n.linkUrl;
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user: User | null = getCurrentUser();

  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 overflow-hidden">
      <aside
        className={cn(
          "flex flex-col bg-neutral-950 text-white transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
          <div className="shrink-0 w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
            <Diamond className="w-5 h-5 text-neutral-950" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-bold tracking-tight">MLR</p>
              <p className="text-[11px] text-neutral-400">Luxury Rental Platform</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-amber-500 text-neutral-950 font-medium"
                      : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName ?? "Guest"}</p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {user ? roleLabel(user.role) : ""}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {user && (
          <div className="flex justify-end items-center px-6 py-2 border-b border-neutral-200 bg-white">
            <NotificationBell />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
