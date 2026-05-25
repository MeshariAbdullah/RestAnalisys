import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Check,
  ScrollText,
  User as UserIcon,
} from "lucide-react";
import type { Role, User } from "@/lib/api";
import { notificationsApi } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/browse", label: "Browse Catalog", icon: ShoppingBag, roles: ["renter"] },
  { href: "/my-rentals", label: "My Rentals", icon: FileText, roles: ["renter"] },
  { href: "/owner", label: "Owner Dashboard", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/owner/submit", label: "Submit Asset", icon: Diamond, roles: ["owner"] },
  { href: "/owner/payouts", label: "Payouts", icon: Wallet, roles: ["owner"] },
  { href: "/inspector", label: "Inspection Queue", icon: ClipboardCheck, roles: ["inspector"] },
  { href: "/ops", label: "Ops Dashboard", icon: LayoutDashboard, roles: ["operations"] },
  { href: "/ops/shipments", label: "Shipments", icon: Truck, roles: ["operations"] },
  { href: "/ops/inventory", label: "Inventory", icon: PackageSearch, roles: ["operations"] },
  { href: "/ops/alerts", label: "Alerts", icon: AlertTriangle, roles: ["operations"] },
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const user: User | null = getCurrentUser();
  const queryClient = useQueryClient();

  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    enabled: !!user && notifOpen,
  });

  const unreadCount = unreadData?.count ?? 0;

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
  }

  async function handleMarkRead(id: number) {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
  }

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
            <div className="space-y-2">
              <Link href="/profile">
                <a className="flex items-center gap-3 px-1 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer">
                  <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-neutral-950" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.fullName ?? "Guest"}</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {user ? roleLabel(user.role) : ""}
                    </p>
                  </div>
                </a>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link href="/profile">
                <a className="w-full flex justify-center p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400" title="Profile">
                  <UserIcon className="w-4 h-4" />
                </a>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with notifications */}
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center justify-end px-6 shrink-0">
          {user && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-neutral-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 max-h-[480px] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {(notifData?.items ?? []).length === 0 ? (
                        <div className="p-8 text-center text-neutral-400 text-sm">
                          No notifications yet.
                        </div>
                      ) : (
                        (notifData?.items ?? []).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && handleMarkRead(n.id)}
                            className={cn(
                              "px-4 py-3 border-b border-neutral-50 cursor-pointer hover:bg-neutral-50 transition-colors",
                              !n.read && "bg-amber-50/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {!n.read && (
                                <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                              )}
                              <div className={cn("flex-1 min-w-0", n.read && "ml-5")}>
                                <p className="text-sm font-medium truncate">{n.title}</p>
                                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                                  {n.message}
                                </p>
                                <p className="text-[11px] text-neutral-400 mt-1">
                                  {timeAgo(n.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link href="/notifications">
                      <a
                        className="block p-3 text-center text-xs text-amber-600 hover:bg-neutral-50 border-t border-neutral-100 font-medium"
                        onClick={() => setNotifOpen(false)}
                      >
                        View all notifications
                      </a>
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
