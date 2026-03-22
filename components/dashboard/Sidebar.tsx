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
  Monitor,
  TestTube,
  FlaskRound,
  TrendingUp,
  Package,
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
      { label: "TAT",         icon: Clock,        href: "/dashboard/tat"         },
      { label: "Tests",       icon: Beaker,       href: "/dashboard/tests"       },
      { label: "Numbers",     icon: Hash,         href: "/dashboard/numbers"     },
      { label: "Meta",        icon: Database,     href: "/dashboard/meta"        },
      { label: "Revenue",     icon: DollarSign,   href: "/dashboard/revenue"     },
      { label: "Performance", icon: TrendingUp,   href: "/dashboard/performance" },
    ],
  },
  {
    title: "Quality Management",
    items: [
      { label: "QC Overview",      icon: ShieldCheck,  href: "/dashboard/qc"              },
      { label: "L-J Chart",        icon: BarChart3,    href: "/dashboard/qc?tab=lj"       },
      { label: "Westgard",         icon: Activity,     href: "/dashboard/qc?tab=westgard" },
      { label: "Qualitative QC",   icon: TestTube,     href: "/dashboard/qc?tab=qualitative" },
      { label: "Quantitative QC",  icon: FlaskRound,   href: "/dashboard/qc?tab=quantitative" },
      { label: "QC Stats",         icon: TrendingUp,   href: "/dashboard/qc?tab=stats"    },
    ],
  },
  {
    title: "Samples",
    items: [
      { label: "Samples", icon: Package, href: "/dashboard/samples" },
      { label: "LRIDS",   icon: Monitor, href: "/dashboard/lrids"   },
    ],
  },
  {
    title: "Asset Management",
    items: [
      { label: "Overview",     icon: LayoutDashboard, href: "/dashboard"               },
      { label: "Scan",         icon: ScanSearch,      href: "/dashboard/scan"          },
      { label: "Equipment",    icon: ScanLine,        href: "/dashboard/equipment"     },
      { label: "Maintenance",  icon: Wrench,          href: "/dashboard/maintenance"   },
      { label: "Refrigerator", icon: Thermometer,     href: "/dashboard/refrigerator"  },
      { label: "Analytics",    icon: BarChart3,       href: "/dashboard/analytics"     },
      { label: "Reports",      icon: FileText,        href: "/dashboard/reports"       },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Departments", icon: Building2,     href: "/dashboard/departments" },
      { label: "Admin",       icon: Shield,        href: "/dashboard/admin"       },
      { label: "Settings",    icon: Settings,      href: "/dashboard/settings"    },
    ],
  },
];

function isNavActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  const norm = pathname.replace(/\/$/, "") || "/";
  const h = base.replace(/\/$/, "") || "/";
  if (h === "/dashboard") return norm === "/dashboard";
  if (norm === h) return true;
  return norm.startsWith(h + "/");
}

function getFirstName(user: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (name) return name.split(" ")[0];
  return user?.email?.split("@")[0]?.split(/[._-]/)[0] || "User";
}

function getInitials(user: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (name) {
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return words[0].slice(0, 2).toUpperCase();
  }
  const part = (user?.email || "U").split("@")[0];
  const words = part.split(/[._-]/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return part.slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { collapsed, setCollapsed } = useSidebarLayout();

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-screen flex-shrink-0",
        "transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[64px]" : "w-[230px]"
      )}
      style={{ background: "linear-gradient(180deg, #042f2e 0%, #065f46 60%, #047857 100%)" }}
    >
      {/* ── Logo ── */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-2.5 min-w-0 focus:outline-none"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <FlaskConical size={15} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-white text-base leading-none tracking-tight">Kanta</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#6ee7b7" }}>Operational Intelligence</p>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/40">
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
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon
                      size={15}
                      className={clsx("flex-shrink-0", active ? "text-emerald-700" : "text-white/70")}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 px-2 pb-4 pt-3 border-t border-white/10 space-y-1">
        {user && !collapsed && (
          <div className="px-3 py-2 rounded-xl mb-1">
            <p className="text-sm font-semibold text-white truncate">{getFirstName(user)}</p>
          </div>
        )}
        {user && collapsed && (
          <div className="flex justify-center py-1 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.15)", color: "#6ee7b7" }}
            >
              {getInitials(user)}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          title="Log out"
          className={clsx(
            "flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all w-full",
            "text-white/60 hover:bg-red-500/20 hover:text-red-300",
            collapsed ? "justify-center py-2.5 px-0" : "px-3 py-2"
          )}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-20 w-4 h-12 rounded-r-xl flex items-center justify-center shadow-lg transition-all duration-200 z-20"
        style={{ background: "#047857", color: "rgba(255,255,255,0.7)" }}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="transition-transform duration-200">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </span>
      </button>
    </aside>
  );
}
