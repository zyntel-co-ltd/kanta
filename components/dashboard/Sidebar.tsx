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
      { label: "QC Overview",     icon: ShieldCheck, href: "/dashboard/qc"                  },
      { label: "L-J Chart",       icon: BarChart3,   href: "/dashboard/qc?tab=lj"           },
      { label: "Westgard",        icon: Activity,    href: "/dashboard/qc?tab=westgard"     },
      { label: "Qualitative QC",  icon: TestTube,    href: "/dashboard/qc?tab=qualitative"  },
      { label: "Quantitative QC", icon: FlaskRound,  href: "/dashboard/qc?tab=quantitative" },
      { label: "QC Stats",        icon: TrendingUp,  href: "/dashboard/qc?tab=stats"        },
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
      { label: "Overview",     icon: LayoutDashboard, href: "/dashboard"              },
      { label: "Scan",         icon: ScanSearch,      href: "/dashboard/scan"         },
      { label: "Equipment",    icon: ScanLine,        href: "/dashboard/equipment"    },
      { label: "Maintenance",  icon: Wrench,          href: "/dashboard/maintenance"  },
      { label: "Refrigerator", icon: Thermometer,     href: "/dashboard/refrigerator" },
      { label: "Analytics",    icon: BarChart3,       href: "/dashboard/analytics"    },
      { label: "Reports",      icon: FileText,        href: "/dashboard/reports"      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "AI Insights", icon: Brain, href: "/dashboard/intelligence" },
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

/* ─── Design tokens ─── */
const BG       = "#065f46";   // solid emerald — used for sidebar + notch fill
const ACTIVE   = "#047857";   // icon/text colour on white pill
const INACTIVE = "rgba(255,255,255,0.72)";
const PILL_L   = 10;          // px from left where white pill starts (both states)
const NOTCH    = 16;          // px — size of corner-notch squares

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { collapsed, setCollapsed } = useSidebarLayout();

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-screen flex-shrink-0",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[248px]"
      )}
      style={{ backgroundColor: BG }}
    >

      {/* ── Logo ── */}
      <div
        className={clsx(
          "flex-shrink-0 flex items-center border-b border-white/10 py-[14px]",
          collapsed ? "justify-center px-0" : "px-4 gap-3"
        )}
      >
        <Link
          href="/dashboard/home"
          className={clsx("flex items-center focus:outline-none", collapsed ? "justify-center" : "gap-3")}
        >
          {/* White icon box — same look in both states */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <FlaskConical size={20} strokeWidth={1.5} style={{ color: ACTIVE }} />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-white text-[15px] leading-none tracking-tight">Kanta</p>
              <p className="text-[10px] mt-1 font-normal text-white/50">Operational Intelligence</p>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 flex flex-col">
        <div className="flex-1">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-1">
              {/* Group label (expanded only) */}
              {!collapsed && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  {group.title}
                </p>
              )}

              {/* Items — gap-0 so notches touch adjacent rows seamlessly */}
              <div className="flex flex-col gap-0">
                {group.items.map(({ label, icon: Icon, href }) => {
                  const active = isNavActive(pathname, href);
                  return (
                    <div key={href + label} className="relative">

                      {/* ── Active white pill ── */}
                      {active && (
                        <span
                          className="absolute inset-y-0 right-0 bg-white"
                          style={{ left: PILL_L, borderRadius: "12px 0 0 12px", zIndex: 1 }}
                        />
                      )}

                      {/* ── Notch — top-left of pill (inside row bounds) ── */}
                      {active && (
                        <span
                          className="absolute pointer-events-none"
                          style={{
                            top: 0,
                            left: PILL_L,
                            width: NOTCH,
                            height: NOTCH,
                            backgroundColor: BG,
                            borderBottomRightRadius: "100%",
                            zIndex: 2,
                          }}
                        />
                      )}

                      {/* ── Notch — bottom-left of pill (inside row bounds) ── */}
                      {active && (
                        <span
                          className="absolute pointer-events-none"
                          style={{
                            bottom: 0,
                            left: PILL_L,
                            width: NOTCH,
                            height: NOTCH,
                            backgroundColor: BG,
                            borderTopRightRadius: "100%",
                            zIndex: 2,
                          }}
                        />
                      )}

                      <Link
                        href={href}
                        title={collapsed ? label : undefined}
                        className={clsx(
                          "relative flex items-center py-[11px] transition-colors duration-150 focus:outline-none",
                          collapsed ? "justify-center px-0" : "gap-3 px-5",
                          !active && "hover:bg-white/10"
                        )}
                        style={{ color: active ? ACTIVE : INACTIVE, zIndex: 3 }}
                      >
                        <Icon
                          size={collapsed ? 22 : 20}
                          strokeWidth={1.5}
                          className="flex-shrink-0"
                        />
                        {!collapsed && (
                          <span className="truncate text-[13.5px] font-medium">{label}</span>
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer: user + logout ── */}
        <div className="flex-shrink-0 border-t border-white/10 pt-2 mt-3">
          {/* User avatar / name */}
          {user && collapsed && (
            <div className="flex justify-center py-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white border border-white/25"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                {getInitials(user)}
              </div>
            </div>
          )}
          {user && !collapsed && (
            <div className="px-5 py-1.5">
              <p className="text-[13px] font-medium text-white/60 truncate">{getFirstName(user)}</p>
            </div>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={() => signOut()}
            title="Log out"
            aria-label="Log out"
            className={clsx(
              "flex items-center w-full py-[11px] transition-colors duration-150 hover:bg-red-500/20 focus:outline-none",
              collapsed ? "justify-center px-0" : "gap-3 px-5"
            )}
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            <LogOut size={collapsed ? 20 : 18} strokeWidth={1.5} className="flex-shrink-0" />
            {!collapsed && (
              <span className="text-[13.5px] font-medium">Log out</span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3.5 top-[72px] w-7 h-7 rounded-full bg-white shadow-lg border-2 flex items-center justify-center z-50 transition-all duration-200 hover:scale-110 focus:outline-none"
        style={{ borderColor: BG, color: BG }}
      >
        {collapsed
          ? <ChevronRight size={13} strokeWidth={2.5} />
          : <ChevronLeft  size={13} strokeWidth={2.5} />
        }
      </button>
    </aside>
  );
}
