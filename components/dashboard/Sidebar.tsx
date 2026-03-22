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
  Brain,
  Activity,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
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
    title: "Intelligence",
    items: [
      { label: "AI Insights",  icon: Brain,    href: "/dashboard/intelligence" },
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

  /* Login page green palette */
  const primaryGreen = "#047857";
  const sidebarGradient = "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)";
  const activeBg = "#ecfdf5";
  const inactiveColor = "#8A94A6";
  const inactiveLight = "rgba(255,255,255,0.85)";

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-screen flex-shrink-0 overflow-visible",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[260px]",
        !collapsed && "border-r border-slate-200/80"
      )}
      style={
        collapsed
          ? { background: sidebarGradient }
          : { backgroundColor: "#FFFFFF" }
      }
    >
      {/* ── Logo ── */}
      <div
        className={clsx(
          "flex-shrink-0 flex items-center gap-3 border-b py-4 overflow-hidden",
          collapsed ? "justify-center px-0 border-white/10" : "px-5 border-slate-100"
        )}
      >
        <Link
          href="/dashboard/home"
          className={clsx("flex items-center min-w-0 focus:outline-none", collapsed ? "justify-center" : "gap-3")}
        >
          <div
            className={clsx(
              "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
              collapsed ? "bg-white/15 border border-white/20" : ""
            )}
            style={!collapsed ? { backgroundColor: activeBg } : {}}
          >
            <FlaskConical
              size={18}
              strokeWidth={1.5}
              style={{ color: collapsed ? "white" : primaryGreen }}
            />
          </div>
          {!collapsed && (
            <div>
              <p className="font-semibold text-slate-900 text-base leading-none tracking-tight">Kanta</p>
              <p className="text-[10px] mt-1 font-normal" style={{ color: inactiveColor }}>
                Operational Intelligence
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 space-y-5 flex flex-col">
        <div className={collapsed ? "flex-1 flex flex-col items-center gap-1 px-2" : "space-y-5 px-3"}>
          {navGroups.map((group) => (
            <div key={group.title} className={collapsed ? "" : "space-y-1"}>
              {!collapsed && (
                <p
                  className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: inactiveColor }}
                >
                  {group.title}
                </p>
              )}
              <div className={clsx(collapsed ? "flex flex-col gap-1 w-full" : "space-y-1")}>
                {group.items.map(({ label, icon: Icon, href }) => {
                  const active = isNavActive(pathname, href);
                  return (
                    <Link
                      key={href + label}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={clsx(
                        "relative flex items-center transition-all duration-150",
                        collapsed
                          ? "justify-center py-2.5 rounded-l-none hover:bg-white/10"
                          : "gap-3 pl-5 pr-3 py-2.5 rounded-[10px] font-medium",
                        !collapsed && !active && "hover:bg-emerald-50/60"
                      )}
                      style={
                        collapsed
                          ? {}
                          : {
                              backgroundColor: active ? activeBg : "transparent",
                              color: active ? primaryGreen : inactiveColor,
                            }
                      }
                    >
                      {/* Collapsed: cutout pill for active (white pill with inverted corner notches) */}
                      {collapsed && active && (
                        <span
                          className="absolute right-0 top-0 bottom-0 w-[52px] bg-white rounded-l-[14px] before:content-[''] before:absolute before:left-0 before:top-0 before:w-7 before:h-7 before:rounded-full before:bg-[#065f46] before:-translate-x-1/2 before:-translate-y-1/2 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-7 after:h-7 after:rounded-full after:bg-[#065f46] after:-translate-x-1/2 after:translate-y-1/2"
                          style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.06)" }}
                        />
                      )}
                      {collapsed ? (
                        <Icon
                          size={22}
                          strokeWidth={1.5}
                          className="relative z-10 flex-shrink-0"
                          style={{ color: active ? primaryGreen : inactiveLight }}
                        />
                      ) : (
                        <>
                          {active && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                              style={{ backgroundColor: primaryGreen }}
                            />
                          )}
                          <Icon size={20} strokeWidth={1.5} className="flex-shrink-0" />
                          <span className="truncate">{label}</span>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer (Logout) ── */}
        <div className={clsx("flex-shrink-0 pt-3 mt-auto", collapsed ? "flex flex-col items-center gap-1 px-2 border-t border-white/10" : "px-3 pb-4 border-t border-slate-100 space-y-1")}>
          {user && !collapsed && (
            <div className="px-4 py-2 rounded-[10px] mb-1">
              <p className="text-sm font-medium text-slate-800 truncate">{getFirstName(user)}</p>
            </div>
          )}
          {user && collapsed && (
            <div className="flex justify-center py-1 mb-1">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold bg-white/15 border border-white/20 text-white">
                {getInitials(user)}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            title="Log out"
            aria-label="Log out"
            className={clsx(
              "group relative flex items-center gap-3 rounded-[10px] text-sm font-medium transition-all duration-200 w-full",
              "border border-transparent",
              collapsed
                ? "justify-center py-3 px-0 mt-1 hover:bg-red-500/20"
                : "pl-5 pr-3 py-2.5 mt-2 hover:bg-red-50 hover:border-red-100"
            )}
            style={
              collapsed
                ? { color: "rgba(255,255,255,0.9)" }
                : { color: inactiveColor }
            }
          >
            {!collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" aria-hidden />
            )}
            <LogOut size={collapsed ? 20 : 18} strokeWidth={1.5} className="flex-shrink-0" />
            {!collapsed && (
              <span className="font-medium group-hover:text-red-600 transition-colors">Log out</span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={clsx(
          "absolute -right-4 top-20 w-4 h-12 rounded-r-lg flex items-center justify-center shadow-md transition-all duration-200 z-20",
          collapsed ? "bg-white/20 border border-white/30 border-l-0" : "bg-white border border-slate-200 border-l-0"
        )}
        style={{ color: collapsed ? "white" : primaryGreen }}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="transition-transform duration-200">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </span>
      </button>
    </aside>
  );
}
