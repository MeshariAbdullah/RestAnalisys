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
  Globe,
} from "lucide-react";
import type { Role, User } from "@/lib/api";
import { notificationsApi } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/browse", labelKey: "nav.browse", icon: ShoppingBag, roles: ["renter"] },
  { href: "/my-rentals", labelKey: "nav.myRentals", icon: FileText, roles: ["renter"] },
  { href: "/owner", labelKey: "nav.ownerDashboard", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/owner/submit", labelKey: "nav.submitAsset", icon: Diamond, roles: ["owner"] },
  { href: "/owner/payouts", labelKey: "nav.payouts", icon: Wallet, roles: ["owner"] },
  { href: "/inspector", labelKey: "nav.inspectorQueue", icon: ClipboardCheck, roles: ["inspector"] },
  { href: "/ops", labelKey: "nav.opsDashboard", icon: LayoutDashboard, roles: ["operations"] },
  { href: "/ops/shipments", labelKey: "nav.shipments", icon: Truck, roles: ["operations"] },
  { href: "/ops/inventory", labelKey: "nav.inventory", icon: PackageSearch, roles: ["operations"] },
  { href: "/ops/alerts", labelKey: "nav.alerts", icon: AlertTriangle, roles: ["operations"] },
  { href: "/admin", labelKey: "nav.adminDashboard", icon: LayoutDashboard, roles: ["admin", "super_admin"] },
  { href: "/admin/approvals", labelKey: "nav.assetApprovals", icon: ClipboardCheck, roles: ["admin", "super_admin"] },
  { href: "/admin/users", labelKey: "nav.users", icon: UsersIcon, roles: ["admin", "super_admin"] },
  { href: "/admin/disputes", labelKey: "nav.disputes", icon: Gavel, roles: ["admin", "super_admin"] },
  { href: "/admin/sanad", labelKey: "nav.sanadTracking", icon: FileSignature, roles: ["admin", "super_admin"] },
  { href: "/admin/finance", labelKey: "nav.financialOverview", icon: Receipt, roles: ["admin", "super_admin"] },
];

function roleLabel(role: Role, t: (key: TranslationKey) => string): string {
  const map: Record<Role, TranslationKey> = {
    renter: "role.renter",
    owner: "role.owner",
    inspector: "role.inspector",
    operations: "role.operations",
    admin: "role.admin",
    super_admin: "role.super_admin",
  };
  return t(map[role]);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user: User | null = getCurrentUser();
  const { t, lang, setLang } = useI18n();
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unreadCount = unreadData?.count ?? 0;

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
              <p className="text-[11px] text-neutral-400">
                {lang === "ar" ? "منصة تأجير الفخامة" : "Luxury Rental Platform"}
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ms-auto p-1 rounded hover:bg-neutral-800 transition-colors"
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
                  {sidebarOpen && <span>{t(item.labelKey)}</span>}
                </a>
              </Link>
            );
          })}

          {user && (
            <Link href="/notifications">
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  location === "/notifications"
                    ? "bg-amber-500 text-neutral-950 font-medium"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <div className="relative shrink-0">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {sidebarOpen && <span>{t("nav.notifications")}</span>}
              </a>
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-neutral-800 space-y-2">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4 shrink-0" />
            {sidebarOpen && (
              <span>{lang === "ar" ? "English" : "العربية"}</span>
            )}
          </button>

          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName ?? t("common.guest")}</p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {user ? roleLabel(user.role, t) : ""}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                title={t("common.logout")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400"
              title={t("common.logout")}
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
