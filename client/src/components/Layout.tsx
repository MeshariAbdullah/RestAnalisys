import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
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
  CheckCheck,
  User as UserIcon,
  ScrollText,
} from "lucide-react";
import type { Role, User, AppNotification } from "@/lib/api";
import { notificationsApi } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";

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
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["admin", "super_admin"] },
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
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user: User | null = getCurrentUser();

  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    notificationsApi.unreadCount().then((r) => setUnreadCount(r.count)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.unreadCount().then((r) => setUnreadCount(r.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function openNotifications() {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    setNotifOpen(true);
    setNotifsLoading(true);
    try {
      const list = await notificationsApi.list(20);
      setNotifs(list);
    } catch {
      setNotifs([]);
    } finally {
      setNotifsLoading(false);
    }
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleNotifClick(n: AppNotification) {
    if (!n.read) {
      notificationsApi.markRead(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.linkUrl) {
      navigate(n.linkUrl);
      setNotifOpen(false);
    }
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

        <div className="p-3 border-t border-neutral-800 space-y-2">
          {/* Notifications bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={openNotifications}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full",
                notifOpen
                  ? "bg-amber-500 text-neutral-950 font-medium"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              )}
            >
              <div className="relative">
                <Bell className="w-5 h-5 shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {sidebarOpen && <span>Notifications</span>}
            </button>

            {notifOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-white text-neutral-900 border border-neutral-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifsLoading ? (
                    <div className="p-6 text-center text-neutral-500 text-sm">Loading...</div>
                  ) : notifs.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors",
                          !n.read && "bg-amber-50/50"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <span className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                          )}
                          <div className={cn("flex-1 min-w-0", n.read && "pl-4")}>
                            <p className="text-sm font-medium truncate">{n.title}</p>
                            <p className="text-xs text-neutral-500 line-clamp-2">{n.message}</p>
                            <p className="text-[11px] text-neutral-400 mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile link */}
          <Link href="/profile">
            <a
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                location === "/profile"
                  ? "bg-amber-500 text-neutral-950 font-medium"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              )}
            >
              <UserIcon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>Profile</span>}
            </a>
          </Link>

          {/* User info + logout */}
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

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
