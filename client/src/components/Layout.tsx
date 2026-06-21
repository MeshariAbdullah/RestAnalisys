import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Heart,
  User as UserIcon,
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
  { href: "/favorites", label: "Wishlist", icon: Heart, roles: ["renter"] },

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function TopBar({ user }: { user: User | null }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const queryClient = useQueryClient();
  const authenticated = isAuthenticated();

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: authenticated,
    refetchInterval: 30000,
  });

  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
    enabled: authenticated && showNotifs,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = unreadData?.count ?? 0;

  if (!authenticated) return null;

  return (
    <header className="h-14 border-b border-neutral-200 bg-white flex items-center justify-end px-6 gap-3 shrink-0">
      <Link href="/profile">
        <a className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600 hover:text-neutral-900">
          <UserIcon className="w-5 h-5" />
        </a>
      </Link>

      <div className="relative">
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600 hover:text-neutral-900 relative"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {showNotifs && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
            <div className="absolute right-0 top-12 w-96 max-h-[70vh] bg-white rounded-xl shadow-xl border border-neutral-200 z-50 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {!notifs || notifs.length === 0 ? (
                  <p className="p-6 text-center text-sm text-neutral-400">
                    No notifications yet.
                  </p>
                ) : (
                  notifs.map((n: AppNotification) => (
                    <a
                      key={n.id}
                      href={n.linkUrl ?? "#"}
                      className={cn(
                        "block px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors",
                        !n.read && "bg-amber-50/50"
                      )}
                      onClick={() => setShowNotifs(false)}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
