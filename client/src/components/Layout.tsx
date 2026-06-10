import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./NotificationBell";
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
  User,
} from "lucide-react";
import type { Role, User as UserType } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/browse", labelKey: "nav.browse", icon: ShoppingBag, roles: ["renter"] },
  { href: "/my-rentals", labelKey: "nav.myRentals", icon: FileText, roles: ["renter"] },
  { href: "/owner", labelKey: "nav.ownerDashboard", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/owner/submit", labelKey: "nav.submitAsset", icon: Diamond, roles: ["owner"] },
  { href: "/owner/payouts", labelKey: "nav.payouts", icon: Wallet, roles: ["owner"] },
  { href: "/inspector", labelKey: "nav.inspectionQueue", icon: ClipboardCheck, roles: ["inspector"] },
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const user: UserType | null = getCurrentUser();

  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false);
    };
    if (mq.matches) setSidebarOpen(false);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

  const roleKey = user ? `role.${user.role}` as const : null;

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
        <div className="shrink-0 w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
          <Diamond className="w-5 h-5 text-neutral-950" />
        </div>
        {(sidebarOpen || mobileOpen) && (
          <div>
            <p className="text-sm font-bold tracking-tight">MLR</p>
            <p className="text-[11px] text-neutral-400">
              {t("landing.heroTitle2")}
            </p>
          </div>
        )}
        <button
          onClick={() => {
            if (mobileOpen) setMobileOpen(false);
            else setSidebarOpen(!sidebarOpen);
          }}
          className="ms-auto p-1 rounded hover:bg-neutral-800 transition-colors"
        >
          {sidebarOpen || mobileOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
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
                {(sidebarOpen || mobileOpen) && (
                  <span>{t(item.labelKey as any)}</span>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-neutral-800 space-y-1">
        <NotificationBell compact={!sidebarOpen && !mobileOpen} />
        <LanguageToggle compact={!sidebarOpen && !mobileOpen} />

        <Link href="/profile">
          <a
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              location === "/profile"
                ? "bg-amber-500 text-neutral-950 font-medium"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            )}
          >
            <User className="w-5 h-5 shrink-0" />
            {(sidebarOpen || mobileOpen) && (
              <span>{t("nav.profile")}</span>
            )}
          </a>
        </Link>
      </div>

      <div className="p-3 border-t border-neutral-800">
        {sidebarOpen || mobileOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-neutral-950" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.fullName ?? "Guest"}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {roleKey ? t(roleKey as any) : ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
              title={t("nav.logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded hover:bg-neutral-800 transition-colors text-neutral-400"
            title={t("nav.logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex flex-col bg-neutral-950 text-white w-64 transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-neutral-950 text-white transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 p-3 bg-white border-b border-neutral-200">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <Diamond className="w-4 h-4 text-neutral-950" />
            </div>
            <span className="text-sm font-bold">MLR</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
