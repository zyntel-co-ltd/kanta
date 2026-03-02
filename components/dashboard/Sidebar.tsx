"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ScanLine,
  Wrench,
  Building2,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Equipment", icon: ScanLine, href: "/dashboard/equipment" },
  { label: "Maintenance", icon: Wrench, href: "/dashboard/maintenance" },
  { label: "Departments", icon: Building2, href: "/dashboard/departments" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Reports", icon: FileText, href: "/dashboard/reports" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "relative flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight text-white">
            Kanta
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  "flex-shrink-0 transition-colors",
                  active ? "text-white" : "text-slate-500 group-hover:text-white"
                )}
              />
              {!collapsed && <span>{label}</span>}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 border-t border-slate-800 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <Settings size={18} className="flex-shrink-0 text-slate-500" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* Tier badge */}
        {!collapsed && (
          <div className="mx-1 mt-3 p-3 bg-indigo-950 border border-indigo-800 rounded-xl">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Starter Plan
            </p>
            <p className="text-xs text-slate-400 mt-1">
              50 equipment · 3 departments
            </p>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full"
                style={{ width: "62%" }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">31 / 50 items tracked</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
