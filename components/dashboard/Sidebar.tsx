"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useState } from "react";
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
  { title: "Home", items: [{ label: "Home", icon: Home, href: "/dashboard/home" }] },
  {
    title: "Lab Metrics",
    items: [
      { label: "TAT", icon: Clock, href: "/dashboard/tat" },
      { label: "Tests", icon: Beaker, href: "/dashboard/tests" },
      { label: "Numbers", icon: Hash, href: "/dashboard/numbers" },
      { label: "Meta", icon: Database, href: "/dashboard/meta" },
      { label: "Revenue", icon: DollarSign, href: "/dashboard/revenue" },
      { label: "Performance", icon: TrendingUp, href: "/dashboard/performance" },
    ],
  },
  {
    title: "Quality Management",
    items: [
      { label: "QC Overview", icon: ShieldCheck, href: "/dashboard/qc" },
      { label: "L-J Chart", icon: BarChart3, href: "/dashboard/qc?tab=lj" },
      { label: "Westgard", icon: Activity, href: "/dashboard/qc?tab=westgard" },
      { label: "Qualitative QC", icon: TestTube, href: "/dashboard/qc?tab=qualitative" },
      { label: "Quantitative QC", icon: FlaskRound, href: "/dashboard/qc?tab=quantitative" },
      { label: "QC Stats", icon: TrendingUp, href: "/dashboard/qc?tab=stats" },
    ],
  },
  {
    title: "Samples",
    items: [
      { label: "Samples", icon: Package, href: "/dashboard/samples" },
      { label: "LRIDS", icon: Monitor, href: "/dashboard/lrids" },
    ],
  },
  {
    title: "Asset Management",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Scan", icon: ScanSearch, href: "/dashboard/scan" },
      { label: "Equipment", icon: ScanLine, href: "/dashboard/equipment" },
      { label: "Maintenance", icon: Wrench, href: "/dashboard/maintenance" },
      { label: "Refrigerator", icon: Thermometer, href: "/dashboard/refrigerator" },
      { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
      { label: "Reports", icon: FileText, href: "/dashboard/reports" },
    ],
  },
  { title: "Intelligence", items: [{ label: "AI Insights", icon: Brain, href: "/dashboard/intelligence" }] },
  {
    title: "System",
    items: [
      { label: "Departments", icon: Building2, href: "/dashboard/departments" },
      { label: "Admin", icon: Shield, href: "/dashboard/admin" },
      { label: "Settings", icon: Settings, href: "/dashboard/settings" },
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

function getFirstName(user: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (name) return name.split(" ")[0];
  return user?.email?.split("@")[0]?.split(/[._-]/)[0] || "User";
}

function getInitials(user: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
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

/* ─── Green & white design tokens ─── */
const GRADIENT = "linear-gradient(135deg, #042f2e 0%, #065f46 50%, #047857 100%)";
const BG = "#065f46";
const TEXT = "rgba(255,255,255,0.9)";
const MUTED = "rgba(255,255,255,0.6)";
const ACTIVE_PILL_BG = "rgba(255,255,255,0.12)";
const ACTIVE_TEXT = "#ecfdf5";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { collapsed, setCollapsed } = useSidebarLayout();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside
      className={clsx(
        "relative flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-visible",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{ backgroundColor: BG, borderRadius: "0 28px 28px 0" }}
    >
      {/* ── Header ── */}
      <div
        className={clsx(
          "flex-shrink-0 flex items-center py-4 border-b",
          collapsed ? "justify-center px-0" : "px-5 gap-3",
          "border-white/10"
        )}
      >
        <Link href="/dashboard/home" className={clsx("flex items-center focus:outline-none", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
            <FlaskConical size={20} strokeWidth={1.5} style={{ color: "#047857" }} />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-base leading-none tracking-tight text-white">
                Kanta
              </p>
              <p className="text-[10px] mt-1 font-normal" style={{ color: MUTED }}>
                Operational Intelligence
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-visible py-4 flex flex-col">
        <div className="flex-1 px-3">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-2">
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
                  {group.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ label, icon: Icon, href }) => {
                  const active = isNavActive(pathname, href);
                  const showTooltip = collapsed && (active || hoveredItem === href + label);

                  return (
                    <div
                      key={href + label}
                      className="relative"
                      onMouseEnter={() => setHoveredItem(href + label)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* ── Active: thin vertical gradient bar (left edge) ── */}
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full z-10"
                          style={{ background: GRADIENT }}
                        />
                      )}

                      {/* ── Active: pill-shaped background (expanded) ── */}
                      {active && !collapsed && (
                        <span
                          className="absolute inset-y-0 left-1 right-1 rounded-xl"
                          style={{ backgroundColor: ACTIVE_PILL_BG, zIndex: 0 }}
                        />
                      )}

                      <Link
                        href={href}
                        title={collapsed ? label : undefined}
                        className={clsx(
                          "relative flex items-center py-2.5 rounded-xl transition-all duration-150 focus:outline-none z-[1]",
                          collapsed ? "justify-center px-0" : "gap-3 px-4",
                          !active && "hover:bg-white/10"
                        )}
                        style={{ color: active ? ACTIVE_TEXT : TEXT }}
                      >
                        <Icon size={collapsed ? 22 : 20} strokeWidth={1.5} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
                      </Link>

                      {/* ── Collapsed: pop-out tooltip with gradient + pointer ── */}
                      {showTooltip && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100] flex items-center">
                          {/* Left pointer triangle */}
                          <div
                            className="absolute -left-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px]"
                            style={{ borderRightColor: "#065f46" }}
                          />
                          <div
                            className="px-3 py-2 rounded-lg text-white text-sm font-medium whitespace-nowrap shadow-xl"
                            style={{ background: GRADIENT }}
                          >
                            {label}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-white/10 pt-3 pb-4 px-3">
          {/* User profile */}
          {user && (
            <div className={clsx("flex items-center gap-3", collapsed ? "justify-center mb-3" : "mb-3")}>
              <div
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold bg-white/20 text-white border border-white/25"
              >
                {getInitials(user)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <p className="text-sm font-medium truncate text-white/90">
                    {getFirstName(user)}
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    aria-label="Log out"
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <LogOut size={16} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Logout (collapsed) */}
          {user && collapsed && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => signOut()}
                aria-label="Log out"
                className="p-2.5 rounded-xl hover:bg-red-500/20 text-red-300 transition-colors"
              >
                <LogOut size={20} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-20 w-8 h-8 rounded-full bg-white shadow-lg border-2 flex items-center justify-center z-50 transition-all duration-200 hover:scale-105 focus:outline-none"
        style={{ borderColor: BG, color: BG }}
      >
        {collapsed ? (
          <ChevronRight size={14} strokeWidth={2} />
        ) : (
          <ChevronLeft size={14} strokeWidth={2} />
        )}
      </button>
    </aside>
  );
}
