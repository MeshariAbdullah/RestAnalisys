import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Video,
  BookOpen,
  Bell,
  BarChart3,
  Users,
  Map,
  Store,
  LogOut,
  Menu,
  X,
  ChefHat,
  Shield,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/simulator", label: "محاكي الكاميرا", icon: Video },
  { href: "/recipes", label: "الوصفات", icon: BookOpen },
  { href: "/alerts", label: "التنبيهات", icon: Bell },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/employees", label: "الموظفون", icon: Users },
  { href: "/heatmap", label: "خريطة الحرارة", icon: Map },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: alertStats } = useQuery({
    queryKey: ["alert-stats"],
    queryFn: () => alertsApi.getStats(),
    refetchInterval: 30_000,
  });

  const user = JSON.parse(localStorage.getItem("auth_user") ?? "{}");

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/";
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-slate-900 text-white transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700">
          <div className="shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-bold">مراقبة الجودة</p>
              <p className="text-xs text-slate-400">الفرنشايز</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-auto p-1 rounded hover:bg-slate-700 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  )}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.href === "/alerts" && alertStats && alertStats.open > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                        {alertStats.open > 9 ? "9+" : alertStats.open}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && <span>{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-700">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name ?? "مستخدم"}</p>
                <p className="text-xs text-slate-400 truncate">{user.email ?? ""}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded hover:bg-slate-700 transition-colors text-slate-400"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
