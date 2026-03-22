"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ComponentType } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";
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
  Clock,
  DollarSign,
  Thermometer,
  Beaker,
  Database,
  Shield,
  ListTodo,
  Activity,
  Table2,
  Hash,
  LogOut,
  Home,
  PanelLeftClose,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  href: string;
};

type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Home",
    items: [
      { label: "Home", icon: Home, href: "/dashboard/home" },
    ],
  },
  {
    title: "Lab Metrics",
    items: [
      { label: "TAT", icon: Clock, href: "/dashboard/tat" },
      { label: "Tests", icon: Beaker, href: "/dashboard/tests" },
      { label: "Numbers", icon: Hash, href: "/dashboard/numbers" },
      { label: "Meta", icon: Database, href: "/dashboard/meta" },
      { label: "Revenue", icon: DollarSign, href: "/dashboard/revenue" },
    ],
  },
  {
    title: "Quality Management",
    items: [
      { label: "QC", icon: Beaker, href: "/dashboard/qc" },
    ],
  },
  {
    title: "Asset Management",
    items: [
      { label: "Assets Overview", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Scan", icon: ScanSearch, href: "/dashboard/scan" },
      { label: "Equipment", icon: ScanLine, href: "/dashboard/equipment" },
      { label: "Maintenance", icon: Wrench, href: "/dashboard/maintenance" },
      { label: "Refrigerator", icon: Thermometer, href: "/dashboard/refrigerator" },
      { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
      { label: "Reports", icon: FileText, href: "/dashboard/reports" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Departments", icon: Building2, href: "/dashboard/departments" },
      { label: "Reception", icon: Table2, href: "/dashboard/reception" },
      { label: "Tracker", icon: ListTodo, href: "/dashboard/tracker" },
      { label: "Progress", icon: Activity, href: "/dashboard/progress" },
      { label: "Admin", icon: Shield, href: "/dashboard/admin" },
      { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ],
  },
];

function isNavActive(pathname: string, href: string) {
  const norm = pathname.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/dashboard") {
    return norm === "/dashboard";
  }
  if (norm === h) return true;
  return norm.startsWith(h + "/");
}

function getInitials(email: string) {
  const part = email.split("@")[0];
  const words = part.split(/[._-]/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2);
  }
  return part.slice(0, 2).toUpperCase();
}

function getDisplayName(user: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (name) return name.split(" ").slice(0, 2).join(" ");
  return user?.email?.split("@")[0] || "User";
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { collapsed, setCollapsed, hidden, setHidden } = useSidebarLayout();

  if (hidden) {
    return null;
  }

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-screen text-white transition-all duration-300 ease-in-out overflow-hidden",
        "border-r border-white/40",
        collapsed ? "w-16" : "w-60"
      )}
      style={{
        background: "linear-gradient(180deg, #1e1b4b 0%, #1e1b4b 40%, #1a1040 100%)",
      }}
    >
      {/* Logo — links to post-login home */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-3 min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap size={15} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <span className="font-bold text-lg tracking-tight text-white leading-none block">
                Kanta
              </span>
              <span className="block text-xs text-slate-500 leading-none mt-0.5">
                Operational Intelligence
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Hide sidebar (optional layout) */}
      <div className={clsx("px-2 pt-2", collapsed && "px-1")}>
        <button
          type="button"
          onClick={() => setHidden(true)}
          title="Hide sidebar"
          className={clsx(
            "flex items-center gap-2 w-full rounded-xl text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors",
            collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
          )}
        >
          <PanelLeftClose size={15} className="flex-shrink-0" />
          {!collapsed && <span>Hide sidebar</span>}
        </button>
      </div>

      {/* Nav — grouped panels */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-300/70"
                style={{ letterSpacing: "0.1em" }}>
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, icon: Icon, href }) => {
                const active = isNavActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                        active
                          ? "bg-white/20"
                          : "bg-transparent group-hover:bg-white/10"
                      )}
                    >
                      <Icon
                        size={15}
                        className={clsx(
                          active ? "text-white" : "text-slate-500 group-hover:text-white"
                        )}
                      />
                    </div>
                    {!collapsed && <span className="truncate">{label}</span>}
                    {active && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 px-2 pb-4 border-t border-white/5 pt-3 space-y-2">
        {user && (
          <div
            className={clsx(
              "flex items-center gap-2.5 rounded-xl hover:bg-white/5 transition-colors",
              collapsed ? "justify-center px-1 py-2" : "px-3 py-2.5"
            )}
          >
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                {getInitials(user.email || "")}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {getDisplayName(user)}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut()}
          title="Sign out"
          className={clsx(
            "flex items-center gap-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full text-left",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
          )}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
            <LogOut size={15} className="text-slate-500" />
          </div>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all z-10"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
