import React, { useState } from "react";
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
  User,
  Globe,
  ScrollText,
} from "lucide-react";
import type { Role, User as UserType } from "@/lib/api";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  // Renter
  { href: "/browse", labelKey: "nav.browse", icon: ShoppingBag, roles: ["renter"] },
  { href: "/my-rentals", labelKey: "nav.myRentals", icon: FileText, roles: ["renter"] },

  // Owner
  { href: "/owner", labelKey: "nav.ownerDashboard", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/owner/submit", labelKey: "nav.submitAsset", icon: Diamond, roles: ["owner"] },
  { href: "/owner/payouts", labelKey: "nav.payouts", icon: Wallet, roles: ["owner"] },

  // Inspector
  { href: "/inspector", labelKey: "nav.inspectionQueue", icon: ClipboardCheck, roles: ["inspector"] },

  // Operations
  { href: "/ops", labelKey: "nav.opsDashboard", icon: LayoutDashboard, roles: ["operations"] },
  { href: "/ops/shipments", labelKey: "nav.shipments", icon: Truck, roles: ["operations"] },
  { href: "/ops/inventory", labelKey: "nav.inventory", icon: PackageSearch, roles: ["operations"] },
  { href: "/ops/alerts", labelKey: "nav.alerts", icon: AlertTriangle, roles: ["operations"] },

  // Admin
  { href: "/admin", labelKey: "nav.adminDashboard", icon: LayoutDashboard, roles: ["admin", "super_admin"] },
  { href: "/admin/approvals", labelKey: "nav.assetApprovals", icon: ClipboardCheck, roles: ["admin", "super_admin"] },
  { href: "/admin/users", labelKey: "nav.users", icon: UsersIcon, roles: ["admin", "super_admin"] },
  { href: "/admin/disputes", labelKey: "nav.disputes", icon: Gavel, roles: ["admin", "super_admin"] },
  { href: "/admin/sanad", labelKey: "nav.sanadTracking", icon: FileSignature, roles: ["admin", "super_admin"] },
  { href: "/admin/finance", labelKey: "nav.financialOverview", icon: Receipt, roles: ["admin", "super_admin"] },
  { href: "/admin/audit", labelKey: "nav.auditLogs", icon: ScrollText, roles: ["admin", "super_admin"] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user: UserType | null = getCurrentUser();
  const { t, locale, changeLocale, isRtl } = useLocale();

  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

  return (
    <div className={cn("flex h-screen bg-neutral-50 text-neutral-900 overflow-hidden", isRtl && "flex-row-reverse")}>
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
              <p className="text-sm font-bold tracking-tight">{t("app.name")}</p>
              <p className="text-[11px] text-neutral-400">{t("app.tagline")}</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn("p-1 rounded hover:bg-neutral-800 transition-colors", sidebarOpen ? "ml-auto" : "")}
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
                  {sidebarOpen && <span>{t(item.labelKey as any)}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-neutral-800 space-y-1">
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
              {sidebarOpen && <span>{t("nav.profile")}</span>}
            </a>
          </Link>

          <button
            onClick={() => changeLocale(locale === "en" ? "ar" : "en")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <Globe className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{locale === "en" ? "العربية" : "English"}</span>}
          </button>
        </div>

        <div className="p-3 border-t border-neutral-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName ?? t("common.guest")}</p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {user ? t(`role.${user.role}` as any) : ""}
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
