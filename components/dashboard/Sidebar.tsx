"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ScanLine,
  ScanSearch,
  Wrench,
  Building2,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  ArrowUpRight,
  Clock,
  DollarSign,
  Thermometer,
  Beaker,
  Database,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",   icon: LayoutDashboard, href: "/dashboard" },
  { label: "Scan",        icon: ScanSearch,       href: "/dashboard/scan" },
  { label: "Equipment",   icon: ScanLine,         href: "/dashboard/equipment" },
  { label: "Maintenance", icon: Wrench,           href: "/dashboard/maintenance" },
  { label: "TAT",         icon: Clock,           href: "/dashboard/tat" },
  { label: "Tests",       icon: Beaker,          href: "/dashboard/tests" },
  { label: "Meta",        icon: Database,        href: "/dashboard/meta" },
  { label: "Revenue",     icon: DollarSign,      href: "/dashboard/revenue" },
  { label: "Refrigerator", icon: Thermometer,    href: "/dashboard/refrigerator" },
  { label: "QC",          icon: Beaker,          href: "/dashboard/qc" },
  { label: "Departments", icon: Building2,        href: "/dashboard/departments" },
  { label: "Analytics",   icon: BarChart3,        href: "/dashboard/analytics" },
  { label: "Reports",     icon: FileText,         href: "/dashboard/reports" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "relative flex flex-col text-white transition-all duration-300 ease-in-out",
        "bg-gradient-to-b from-slate-900 to-slate-950",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-lg tracking-tight text-white leading-none">Kanta</span>
            <span className="block text-xs text-slate-500 leading-none mt-0.5">Operational Intelligence</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                active
                  ? "bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {/* Active icon pill */}
              <div className={clsx(
                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                active
                  ? "bg-white/20"
                  : "bg-transparent group-hover:bg-white/10"
              )}>
                <Icon size={15} className={clsx(active ? "text-white" : "text-slate-500 group-hover:text-white")} />
              </div>

              {!collapsed && <span>{label}</span>}

              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 border-t border-white/5 pt-3 space-y-2">

        {/* User avatar */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                WM
              </div>
              {/* Online ring */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Wycliffe M.</p>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Admin
              </span>
            </div>
          </div>
        )}

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-transparent group-hover:bg-white/10">
            <Settings size={15} className="text-slate-500" />
          </div>
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* Upgrade CTA */}
        {!collapsed && (
          <div className="mx-1 mt-1 p-3 bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Starter</p>
              <button className="flex items-center gap-0.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Upgrade <ArrowUpRight size={11} />
              </button>
            </div>

            {/* Arc-style progress */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: "62%" }}
                />
              </div>
              <span className="text-xs font-semibold text-indigo-300">62%</span>
            </div>
            <p className="text-xs text-slate-500">31 / 50 items · 2 / 3 depts</p>
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
