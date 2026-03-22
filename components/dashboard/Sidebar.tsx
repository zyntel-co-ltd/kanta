"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ComponentType } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";
import {
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Building2,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Thermometer,
  Beaker,
  Database,
  Shield,
  Hash,
  LogOut,
  Home,
  FlaskConical,
  ShieldCheck,
  Activity,
  Layers,
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
    items: [{ label: "Home", icon: Home, href: "/dashboard/home" }],
  },
  {
    title: "Lab Metrics",
    items: [
      { label: "TAT",     icon: Clock,       href: "/dashboard/tat"     },
      { label: "Tests",   icon: Beaker,      href: "/dashboard/tests"   },
      { label: "Numbers", icon: Hash,        href: "/dashboard/numbers" },
      { label: "Meta",    icon: Database,    href: "/dashboard/meta"    },
      { label: "Revenue", icon: DollarSign,  href: "/dashboard/revenue" },
    ],
  },
  {
    title: "Quality Management",
    items: [
      { label: "QC Overview",    icon: ShieldCheck, href: "/dashboard/qc" },
    ],
  },
  {
    title: "Asset Management",
    items: [
      { label: "Overview",      icon: LayoutDashboard, href: "/dashboard"               },
      { label: "Scan",          icon: ScanSearch,      href: "/dashboard/scan"          },
      { label: "Equipment",     icon: ScanLine,        href: "/dashboard/equipment"     },
      { label: "Maintenance",   icon: Wrench,          href: "/dashboard/maintenance"   },
      { label: "Refrigerator",  icon: Thermometer,     href: "/dashboard/refrigerator"  },
      { label: "Analytics",     icon: BarChart3,       href: "/dashboard/analytics"     },
      { label: "Reports",       icon: FileText,        href: "/dashboard/reports"       },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Departments", icon: Building2, href: "/dashboard/departments" },
      { label: "Admin",       icon: Shield,    href: "/dashboard/admin"       },
      { label: "Settings",    icon: Settings,  href: "/dashboard/settings"    },
    ],
  },
];

function isNavActive(pathname: string, href: string) {
  const norm = pathname.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/dashboard") return norm === "/dashboard";
  if (norm === h) return true;
  return norm.startsWith(h + "/");
}

function getInitials(email: string) {
  const part = email.split("@")[0];
  const words = part.split(/[._-]/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
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
  const { collapsed, setCollapsed } = useSidebarLayout();

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-screen bg-white border-r border-slate-200 flex-shrink-0",
        "transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-2.5 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-lg"
        >
          <div className="flex-shrink-0 w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <Layers size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span
              className="font-bold text-slate-900 tracking-tight truncate"
              style={{ fontSize: "1.0625rem", letterSpacing: "-0.02em" }}
            >
              Kanta
            </span>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, icon: Icon, href }) => {
                const active = isNavActive(pathname, href);
                return (
                  <Link
                    key={href + label}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                      collapsed ? "justify-center py-2.5 px-0" : "px-3 py-2",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon size={15} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 px-2 pb-3 pt-3 border-t border-slate-100 space-y-1">
        {user && !collapsed && (
          <div className="px-3 py-2 rounded-xl mb-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{getDisplayName(user)}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        {user && collapsed && (
          <div className="flex justify-center py-1 mb-1">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
              {getInitials(user.email || "")}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          title="Sign out"
          className={clsx(
            "flex items-center gap-2.5 rounded-xl text-sm font-medium text-slate-500",
            "hover:bg-red-50 hover:text-red-600 transition-all w-full",
            collapsed ? "justify-center py-2.5 px-0" : "px-3 py-2"
          )}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* ── Collapse toggle — pill tab extending from sidebar edge ── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-5 top-20 w-5 h-14 bg-slate-900 rounded-r-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-cyan-600 shadow-lg transition-all duration-200 z-20 group"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </span>
      </button>
    </aside>
  );
}
