"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useState, useEffect } from "react";
import type { ComponentType } from "react";
import { useAuth, type FacilityAuthState } from "@/lib/AuthContext";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";
import { MODULE_THEMES } from "@/lib/design-tokens";
import {
  LayoutDashboard,
  ScanLine,
  Wrench,
  Building2,
  BarChart3,
  Binary,
  ChartColumnIncreasing,
  CircleDollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Thermometer,
  Shield,
  TableProperties,
  Timer,
  LogOut,
  Home,
  FlaskConical,
  ShieldCheck,
  TestTube,
  TrendingUp,
  Brain,
  Activity,
  Calculator,
  ClipboardList,
  Grid3X3,
  AlertTriangle,
  Archive,
  Search,
  TestTubes,
  QrCode,
  CalendarClock,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  href: string;
  /** When set, a section label is rendered above this item (collapsible sub-menus only). */
  section?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
  /** If set, renders the group as a collapsible accordion with this parent link */
  collapsible?: {
    parentHref: string;
    parentIcon: NavItem["icon"];
    /** Extra paths (besides parentHref) that trigger the "active" highlight */
    activePaths?: string[];
  };
};

const navGroupsBase: NavGroup[] = [
  { title: "Home", items: [{ label: "Home", icon: Home, href: "/dashboard/home" }] },
  {
    title: "Lab Metrics",
    collapsible: {
      parentHref: "/dashboard/lab-analytics",
      parentIcon: ChartColumnIncreasing,
      activePaths: [
        "/dashboard/lab-analytics",
        "/dashboard/tat",
        "/dashboard/numbers",
        "/dashboard/meta",
        "/dashboard/revenue",
        "/dashboard/performance",
      ],
    },
    items: [
      { label: "TAT",         icon: Timer,             href: "/dashboard/tat"         },
      { label: "Volume",      icon: Binary,            href: "/dashboard/numbers"     },
      { label: "Tests & Lab Mgmt", icon: TableProperties,   href: "/dashboard/meta"   },
      { label: "Revenue",     icon: CircleDollarSign,  href: "/dashboard/revenue"     },
      { label: "LRIDS",       icon: TestTube,          href: "/dashboard/tat?tab=lrids" },
    ],
  },
  {
    title: "Quality & samples",
    collapsible: {
      parentHref: "/dashboard/quality-samples",
      parentIcon: ShieldCheck,
      activePaths: ["/dashboard/qc", "/dashboard/samples"],
    },
    items: [
      { section: "QC", label: "QC Config",     icon: FlaskConical,  href: "/dashboard/qc?tab=config"      },
      { label: "Data Entry",    icon: ClipboardList, href: "/dashboard/qc?tab=data"        },
      { label: "Visualization", icon: BarChart3,      href: "/dashboard/qc?tab=visual"      },
      { label: "QC Calculator", icon: Calculator,     href: "/dashboard/qc?tab=calc"        },
      { label: "QC Stats",      icon: TrendingUp,     href: "/dashboard/qc?tab=stats"       },
      { label: "Qual. Config",  icon: FlaskConical,   href: "/dashboard/qc?tab=qual-config" },
      { label: "Qual. Entry",   icon: TestTube,       href: "/dashboard/qc?tab=qual-entry"  },
      { label: "Qual. Log",     icon: Activity,       href: "/dashboard/qc?tab=qual-log"    },
      { section: "Samples", label: "Dashboard",          icon: TestTubes,     href: "/dashboard/samples?tab=dashboard" },
      { label: "Racks",              icon: Grid3X3,       href: "/dashboard/samples?tab=racks"     },
      { label: "Pending Discarding", icon: AlertTriangle, href: "/dashboard/samples?tab=pending"   },
      { label: "Discarded",          icon: Archive,       href: "/dashboard/samples?tab=discarded" },
      { label: "Search",             icon: Search,        href: "/dashboard/samples?tab=search"    },
    ],
  },
  {
    title: "Asset Management",
    collapsible: {
      parentHref: "/dashboard/assets",
      parentIcon: ScanLine,
      activePaths: [
        "/dashboard",
        "/dashboard/assets",
        "/dashboard/scan",
        "/dashboard/equipment",
        "/dashboard/maintenance",
        "/dashboard/refrigerator",
        "/dashboard/analytics",
        "/dashboard/reports",
      ],
    },
    items: [
      { label: "Overview",     icon: LayoutDashboard, href: "/dashboard"              },
      { label: "Scan",         icon: QrCode,         href: "/dashboard/scan"         },
      { label: "Equipment",    icon: Wrench,         href: "/dashboard/equipment"    },
      { label: "Maintenance",  icon: CalendarClock,  href: "/dashboard/maintenance"  },
      { label: "Refrigerator", icon: Thermometer,     href: "/dashboard/refrigerator" },
      { label: "Analytics",    icon: BarChart3,       href: "/dashboard/analytics"    },
    ],
  },
  { title: "Intelligence", items: [{ label: "AI Insights", icon: Brain, href: "/dashboard/intelligence" }] },
  {
    title: "System",
    items: [
      { label: "Departments", icon: Building2, href: "/dashboard/departments" },
      { label: "Admin",       icon: Shield,    href: "/dashboard/admin"       },
      { label: "Hospital Settings", icon: Building2, href: "/dashboard/admin/hospital" },
      { label: "Settings",    icon: Settings,  href: "/dashboard/settings"    },
    ],
  },
];

function filterNavForFacilityAuth(
  groups: NavGroup[],
  fa: FacilityAuthState | null,
  opts: { loading: boolean; hasUser: boolean }
): NavGroup[] {
  if (!opts.hasUser || opts.loading) {
    return groups;
  }

  const effective: FacilityAuthState =
    fa ?? {
      facilityId: null,
      hospitalName: null,
      hospitalLogoUrl: null,
      role: null,
      isSuperAdmin: false,
      canAccessAdmin: false,
      canViewRevenue: false,
      canManageUsers: false,
      canWrite: false,
    };

  if (effective.isSuperAdmin) {
    return groups;
  }

  const canViewRevenue = effective.canViewRevenue;
  const canAccessAdmin = effective.canAccessAdmin;
  const canWrite = effective.canWrite;

  return groups
    .map((g) => {
      if (g.collapsible) {
        const items = g.items.filter((item) => {
          if (item.href.startsWith("/dashboard/revenue") && !canViewRevenue) return false;
          if (item.href.startsWith("/dashboard/admin") && !canAccessAdmin) return false;
          if (item.href.startsWith("/dashboard/departments") && !canAccessAdmin) return false;
          if (!canWrite) {
            if (item.href.includes("tab=data")) return false;
            if (item.href.includes("tab=qual-entry")) return false;
            if (item.href.includes("tab=pending")) return false;
          }
          return true;
        });
        if (items.length === 0) return null;
        return { ...g, items };
      }
      const items = g.items.filter((item) => {
        if (item.href.startsWith("/dashboard/revenue") && !canViewRevenue) return false;
        if (item.href.startsWith("/dashboard/admin") && !canAccessAdmin) return false;
        if (item.href.startsWith("/dashboard/departments") && !canAccessAdmin) return false;
        return true;
      });
      if (items.length === 0) return null;
      return { ...g, items };
    })
    .filter((x): x is NavGroup => x !== null);
}

/** Checks whether a plain (no-query-param) nav href is active for the current pathname */
function isNavActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  const norm = pathname.replace(/\/$/, "") || "/";
  const h = base.replace(/\/$/, "") || "/";
  if (h === "/dashboard") return norm === "/dashboard";
  if (norm === h) return true;
  return norm.startsWith(h + "/");
}

/** Collapsible sub-links: match pathname + query string when the href includes ?tab= etc. */
function isSubLinkActive(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get"> | null,
  href: string
) {
  const [pathPart, queryPart] = href.split("?");
  const base = pathPart.replace(/\/$/, "") || "/";
  const norm = pathname.replace(/\/$/, "") || "/";
  if (norm !== base) return false;
  if (!queryPart) return true;
  const expected = new URLSearchParams(queryPart);
  const actual = searchParams ?? new URLSearchParams();
  for (const [key, value] of expected.entries()) {
    const got = actual.get(key);
    if (got === value) continue;
    /* QC / Samples pages default tab when ?tab= is omitted in the URL */
    if (key === "tab" && got === null) {
      if (base === "/dashboard/qc" && value === "config") continue;
      if (base === "/dashboard/samples" && value === "dashboard") continue;
    }
    return false;
  }
  return true;
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

type ModuleKey = keyof typeof MODULE_THEMES;

function readModuleFromLayout(): ModuleKey {
  if (typeof document === "undefined") return "labMetrics";
  const el = document.querySelector("[data-module]");
  const raw = el?.getAttribute("data-module") || "labMetrics";
  if (raw === "neutral" || raw === "labMetrics" || raw === "qualityManagement" || raw === "assetManagement") return raw;
  return "labMetrics";
}

function homeGroupColor(title: string): string {
  if (title === "Lab Metrics") return "#0f6b52";
  if (title === "Quality & samples") return "#2b4a72";
  if (title === "Asset Management") return "#8a2b2b";
  return "#334155";
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut, facilityAuth, facilityAuthLoading } = useAuth();
  const hospitalName = facilityAuth?.hospitalName || process.env.NEXT_PUBLIC_HOSPITAL_NAME || "Zyntel Hospital";
  const hospitalLogoUrl = facilityAuth?.hospitalLogoUrl || process.env.NEXT_PUBLIC_HOSPITAL_LOGO_URL || "";

  const navGroups = filterNavForFacilityAuth(navGroupsBase, facilityAuth, {
    loading: facilityAuthLoading,
    hasUser: !!user,
  });
  const { collapsed, setCollapsed } = useSidebarLayout();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [moduleKey, setModuleKey] = useState<ModuleKey>(() => readModuleFromLayout());
  const isNeutralHome = moduleKey === "neutral";

  /* Groups that are currently expanded (accordion) */
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setModuleKey(readModuleFromLayout());
  }, [pathname]);

  /* Auto-expand the relevant accordion group based on current page */
  useEffect(() => {
    const toOpen: string[] = [];
    if (
      pathname.startsWith("/dashboard/qc") ||
      pathname.startsWith("/dashboard/samples") ||
      pathname.startsWith("/dashboard/quality-samples")
    ) {
      toOpen.push("Quality & samples");
    }

    const labMetricsPaths = ["/dashboard/tat", "/dashboard/tests", "/dashboard/numbers", "/dashboard/meta", "/dashboard/revenue", "/dashboard/performance"];
    if (pathname === "/dashboard/lab-analytics") toOpen.push("Lab Metrics");
    if (labMetricsPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) toOpen.push("Lab Metrics");

    const assetPaths = ["/dashboard/assets", "/dashboard/equipment", "/dashboard/scan", "/dashboard/maintenance", "/dashboard/refrigerator", "/dashboard/analytics", "/dashboard/reports"];
    if (pathname === "/dashboard" || assetPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) toOpen.push("Asset Management");

    if (toOpen.length === 0) return;
    setOpenGroups((prev) => {
      const next = new Set(prev);
      toOpen.forEach((g) => next.add(g));
      return next.size === prev.size ? prev : next;
    });
  }, [pathname]);

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <aside
      className={clsx(
        "kanta-sidebar relative flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-visible",
        collapsed ? "w-[72px]" : "w-[260px]",
        isNeutralHome && "kanta-sidebar-neutral-glass"
      )}
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderRadius: "0 28px 28px 0",
      }}
    >
      {/* ── Header ── */}
      <div
        className={clsx(
          "flex-shrink-0 flex items-center py-4 border-b",
          collapsed ? "justify-center px-0" : "px-5 gap-3",
          isNeutralHome ? "border-slate-200" : "border-white/10"
        )}
      >
        <Link href="/dashboard/home" className={clsx("flex items-center focus:outline-none", collapsed ? "justify-center" : "gap-3")}>
          {hospitalLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hospitalLogoUrl} alt={hospitalName} className="flex-shrink-0 w-10 h-10 rounded-xl object-cover bg-white shadow-sm" />
          ) : (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
              <FlaskConical size={20} strokeWidth={1.5} style={{ color: MODULE_THEMES[moduleKey].primaryDark }} />
            </div>
          )}
          {!collapsed && (
            <div>
              <p className={clsx("font-bold text-sm leading-tight tracking-tight", isNeutralHome ? "text-slate-900" : "text-white")}>
                {hospitalName}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-visible py-4 flex flex-col">
        <div className="flex-1 px-3">
          {navGroups.map((group) => {
            /* ── Collapsible accordion group (Quality Management) ── */
            if (group.collapsible) {
              const { parentHref, parentIcon: ParentIcon, activePaths = [] } = group.collapsible;
              const allPaths = [parentHref, ...activePaths];
              const isCollapsibleActive = allPaths.some((p) =>
                p === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === p || pathname.startsWith(p + "/")
              );
              const isOpen     = openGroups.has(group.title);
              const parentKey  = parentHref + group.title;
              const showTooltip = collapsed && (isCollapsibleActive || hoveredItem === parentKey);
              const neutralGroup = isNeutralHome ? homeGroupColor(group.title) : undefined;

              return (
                <div key={group.title} className="mb-2">
                  {/* Group label (expanded sidebar only) */}
                  {!collapsed && (
                    <p
                      className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: isNeutralHome ? (neutralGroup ?? "#64748b") : "rgba(255,255,255,0.6)" }}
                    >
                      {group.title}
                    </p>
                  )}

                  {/* Parent row: icon + label + chevron toggle */}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredItem(parentKey)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Active bar (left edge) */}
                    {isCollapsibleActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full z-10"
                        style={{ backgroundColor: "var(--sidebar-active-bg)" }}
                      />
                    )}
                    {/* Active pill background */}
                    {isCollapsibleActive && !collapsed && (
                      <span
                        className="absolute inset-y-0 left-1 right-1 rounded-xl"
                        style={{ backgroundColor: "color-mix(in srgb, var(--sidebar-active-bg) 22%, transparent)", zIndex: 0 }}
                      />
                    )}

                    <div className="flex items-center">
                      {/* Clicking the link area navigates AND opens accordion */}
                      <Link
                        href={parentHref}
                        onClick={() => { if (!collapsed) setOpenGroups((prev) => new Set([...prev, group.title])); }}
                        title={collapsed ? group.title : undefined}
                        className={clsx(
                          "relative flex items-center py-2.5 rounded-xl transition-all duration-150 focus:outline-none z-[1] flex-1",
                          collapsed ? "justify-center px-0" : "gap-3 px-4",
                          collapsed && isNeutralHome && "bg-white/70 border border-slate-200/80 shadow-sm",
                          !isCollapsibleActive && "hover:bg-[var(--sidebar-hover-bg)]/30"
                        )}
                        style={{
                          color: isCollapsibleActive
                            ? "var(--sidebar-active-text)"
                            : (isNeutralHome ? (neutralGroup ?? "#334155") : "rgba(255,255,255,0.9)"),
                        }}
                      >
                        <ParentIcon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                        {!collapsed && (
                          <span className="truncate text-sm font-medium">{group.title}</span>
                        )}
                      </Link>

                      {/* Chevron toggle (expanded sidebar only) */}
                      {!collapsed && (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.title)}
                          aria-label={isOpen ? `Collapse ${group.title}` : `Expand ${group.title}`}
                          className="relative z-[1] flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-all duration-150 mr-1"
                          style={{ color: isCollapsibleActive ? "var(--sidebar-active-text)" : (isNeutralHome ? (neutralGroup ?? "#64748b") : "rgba(255,255,255,0.6)") }}
                        >
                          <ChevronDown
                            size={13}
                            strokeWidth={2.5}
                            className={clsx("transition-transform duration-200", isOpen && "rotate-180")}
                          />
                        </button>
                      )}
                    </div>

                    {/* Collapsed tooltip */}
                    {showTooltip && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100] flex items-center">
                        <div
                          className="absolute -left-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px]"
                          style={{ borderRightColor: "var(--sidebar-bg)" }}
                        />
                        <div
                          className={clsx(
                            "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl",
                            isNeutralHome ? "text-slate-800 border border-slate-200" : "text-white"
                          )}
                          style={{ backgroundColor: "var(--sidebar-active-bg)" }}
                        >
                          {group.title}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub-items — only shown when sidebar is expanded AND accordion is open */}
                  {!collapsed && isOpen && (
                    <div className="mt-1 ml-3 pl-3 border-l border-white/15 flex flex-col gap-0.5">
                      {group.items.map(({ label, icon: Icon, href, section }, idx) => {
                        const key = href + label;
                        const subActive = isSubLinkActive(pathname, searchParams, href);
                        return (
                          <div key={key}>
                            {section && (
                              <p
                                className={clsx(
                                  "pb-1 text-[10px] font-semibold uppercase tracking-widest pl-1",
                                  idx === 0 ? "pt-0" : "pt-2"
                                )}
                                style={{ color: isNeutralHome ? (neutralGroup ?? "#64748b") : "rgba(255,255,255,0.6)" }}
                              >
                                {section}
                              </p>
                            )}
                            <div
                              className="relative"
                              onMouseEnter={() => setHoveredItem(key)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              {subActive && (
                                <span
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full z-10"
                                  style={{ backgroundColor: "var(--sidebar-active-bg)" }}
                                />
                              )}
                              {subActive && (
                                <span
                                  className="absolute inset-y-0 left-0 right-0 rounded-lg"
                                  style={{ backgroundColor: "color-mix(in srgb, var(--sidebar-active-bg) 22%, transparent)", zIndex: 0 }}
                                />
                              )}
                              <Link
                                href={href}
                                className={clsx(
                                  "relative z-[1] flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 focus:outline-none",
                                  subActive ? "" : "hover:bg-[var(--sidebar-hover-bg)]/30"
                                )}
                                style={{ color: subActive ? "var(--sidebar-active-text)" : (isNeutralHome ? (neutralGroup ?? "#334155") : "rgba(255,255,255,0.9)") }}
                              >
                                <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                                <span className="truncate text-xs font-medium">{label}</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ── Regular (flat) group ── */
            return (
              <div key={group.title} className="mb-2">
                {!collapsed && (
                  <p
                    className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: isNeutralHome ? homeGroupColor(group.title) : "rgba(255,255,255,0.6)" }}
                  >
                    {group.title}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ label, icon: Icon, href }) => {
                    const active      = isNavActive(pathname, href);
                    const itemKey     = href + label;
                    const showTooltip = collapsed && (active || hoveredItem === itemKey);

                    return (
                      <div
                        key={itemKey}
                        className="relative"
                        onMouseEnter={() => setHoveredItem(itemKey)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full z-10"
                            style={{ backgroundColor: "var(--sidebar-active-bg)" }}
                          />
                        )}
                        {active && !collapsed && (
                          <span
                            className="absolute inset-y-0 left-1 right-1 rounded-xl"
                            style={{ backgroundColor: "color-mix(in srgb, var(--sidebar-active-bg) 22%, transparent)", zIndex: 0 }}
                          />
                        )}
                        <Link
                          href={href}
                          title={collapsed ? label : undefined}
                          className={clsx(
                            "relative flex items-center py-2.5 rounded-xl transition-all duration-150 focus:outline-none z-[1]",
                            collapsed ? "justify-center px-0" : "gap-3 px-4",
                            collapsed && isNeutralHome && "bg-white/70 border border-slate-200/80 shadow-sm",
                            !active && "hover:bg-[var(--sidebar-hover-bg)]/30"
                          )}
                          style={{ color: active ? "var(--sidebar-active-text)" : (isNeutralHome ? homeGroupColor(group.title) : "rgba(255,255,255,0.9)") }}
                        >
                          <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                          {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
                        </Link>

                        {showTooltip && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100] flex items-center">
                            <div
                              className="absolute -left-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px]"
                              style={{ borderRightColor: "var(--sidebar-bg)" }}
                            />
                            <div
                              className={clsx(
                                "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl",
                                isNeutralHome ? "text-slate-800 border border-slate-200" : "text-white"
                              )}
                              style={{ backgroundColor: "var(--sidebar-active-bg)" }}
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
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className={clsx("flex-shrink-0 border-t pt-3 pb-4 px-3", isNeutralHome ? "border-slate-200" : "border-white/10")}>
          {user && (
            <div className={clsx("flex items-center gap-3", collapsed ? "justify-center mb-3" : "mb-3")}>
              <div className={clsx("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border", isNeutralHome ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/20 text-white border-white/25")}>
                {getInitials(user)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <p className={clsx("text-sm font-medium truncate", isNeutralHome ? "text-slate-700" : "text-white/90")}>{getFirstName(user)}</p>
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
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center z-50 shadow-lg border border-white/30 transition-all duration-200 hover:brightness-110 focus:outline-none"
        style={{ backgroundColor: "var(--sidebar-active-bg)" }}
      >
        <span
          className={clsx(
            "inline-flex items-center justify-center transition-transform duration-200",
            collapsed ? "rotate-0" : "rotate-180"
          )}
        >
          {collapsed ? (
            <ChevronRight size={16} strokeWidth={2.2} className="text-white" />
          ) : (
            <ChevronLeft size={16} strokeWidth={2.2} className="text-white" />
          )}
        </span>
      </button>
    </aside>
  );
}
