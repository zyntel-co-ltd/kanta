"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { ComponentType } from "react";
import { useAuth, type FacilityAuthState } from "@/lib/AuthContext";
import { hospitalDisplayName } from "@/lib/hospitalDisplayName";
import { useFlag } from "@/lib/featureFlags";
import { SIDEBAR_LRIDS_NAV_HREF } from "@/lib/lrids/nav";
import { openLridsBoardInNewTab } from "@/lib/lrids/openBoard";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";
import Tooltip from "@/components/ui/Tooltip";
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
  Table2,
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

// Collapse glyph and toggle live in `DashboardChrome` now (so the control is positioned
// relative to the sidebar wrapper and won't be clipped/hidden).

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
        "/dashboard/lab-metrics",
        "/dashboard/numbers",
        "/dashboard/meta",
        "/dashboard/revenue",
        "/dashboard/performance",
      ],
    },
    items: [
      { label: "TAT",         icon: Timer,             href: "/dashboard/tat"         },
      { label: "Test-level TAT", icon: Table2,         href: "/dashboard/lab-metrics/tat/tests" },
      { label: "Volume",      icon: Binary,            href: "/dashboard/numbers"     },
      { label: "Tests & Lab Mgmt", icon: TableProperties,   href: "/dashboard/meta"   },
      { label: "Revenue",     icon: CircleDollarSign,  href: "/dashboard/revenue"     },
      { label: "LRIDS",       icon: TestTube,          href: SIDEBAR_LRIDS_NAV_HREF },
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
      { label: "Overview",     icon: LayoutDashboard, href: "/dashboard/assets"       },
      { label: "Equipment",    icon: Wrench,          href: "/dashboard/equipment"    },
      { label: "Maintenance",  icon: CalendarClock,   href: "/dashboard/maintenance"  },
      { label: "Refrigerator", icon: Thermometer,     href: "/dashboard/refrigerator" },
      { label: "Scan",         icon: QrCode,          href: "/dashboard/scan"         },
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

export type NavFeatureFlags = {
  showRefrigeratorModule: boolean;
  showLrids: boolean;
  showAiIntelligence: boolean;
  showTatTestLevel: boolean;
};

function filterNavForFacilityAuth(
  groups: NavGroup[],
  fa: FacilityAuthState | null,
  opts: { loading: boolean; hasUser: boolean; flags: NavFeatureFlags }
): NavGroup[] {
  if (!opts.hasUser) {
    return groups;
  }

  if (opts.loading) {
    return filterNavForFacilityAuth(groups, null, {
      hasUser: true,
      loading: false,
      flags: opts.flags,
    });
  }

  const effective: FacilityAuthState =
    fa ?? {
      facilityId: null,
      hospitalName: null,
      hospitalLogoUrl: null,
      subscriptionTier: null,
      role: null,
      isSuperAdmin: false,
      canAccessAdminPanel: false,
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
  const canAccessAdminPanel = effective.canAccessAdminPanel;
  const canWrite = effective.canWrite;
  const { flags } = opts;

  const allowItem = (href: string) => {
    if (href.startsWith("/dashboard/revenue") && !canViewRevenue) return false;
    if (href.startsWith("/dashboard/admin") && !canAccessAdminPanel) return false;
    if (href.startsWith("/dashboard/departments") && !canAccessAdmin) return false;
    if (href.includes("/dashboard/refrigerator") && !flags.showRefrigeratorModule) return false;
    if (
      (href === SIDEBAR_LRIDS_NAV_HREF ||
        href.includes("tab=lrids") ||
        href.startsWith("/dashboard/lrids")) &&
      !flags.showLrids
    ) {
      return false;
    }
    if (href.startsWith("/dashboard/intelligence") && !flags.showAiIntelligence) return false;
    if (href.startsWith("/dashboard/lab-metrics") && !flags.showTatTestLevel) return false;
    if (!canWrite) {
      if (href.includes("tab=data")) return false;
      if (href.includes("tab=qual-entry")) return false;
      if (href.includes("tab=pending")) return false;
    }
    return true;
  };

  return groups
    .map((g) => {
      if (g.collapsible) {
        const items = g.items.filter((item) => allowItem(item.href));
        if (items.length === 0) return null;
        return { ...g, items };
      }
      const items = g.items.filter((item) => allowItem(item.href));
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
  /* Admin panel vs Hospital Settings: /dashboard/admin/hospital must not highlight "Admin" */
  if (h === "/dashboard/admin") {
    if (norm === "/dashboard/admin") return true;
    if (norm.startsWith("/dashboard/admin/hospital")) return false;
    return norm.startsWith(h + "/");
  }
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

function readModuleAttr(): string {
  if (typeof document === "undefined") return "labMetrics";
  const el = document.querySelector("[data-module]");
  return el?.getAttribute("data-module") || "labMetrics";
}

function homeGroupColor(title: string): string {
  if (title === "Lab Metrics") return "#21336a";
  if (title === "Quality & samples") return "#0284c7";
  if (title === "Asset Management") return "#475569";
  return "#334155";
}

/** One-time accordion open for direct URL loads (ENG-127). */
function accordionGroupForPath(pathname: string): string | null {
  if (
    pathname.startsWith("/dashboard/qc") ||
    pathname.startsWith("/dashboard/samples") ||
    pathname.startsWith("/dashboard/quality-samples")
  ) {
    return "Quality & samples";
  }
  // `/dashboard/home` is the hub landing page; it should not auto-expand
  // any accordion (otherwise `/dashboard/*` assetPaths rule would match).
  if (pathname === "/dashboard/home") {
    return null;
  }
  const labPaths = [
    "/dashboard/lab-analytics",
    "/dashboard/tat",
    "/dashboard/lab-metrics",
    "/dashboard/tests",
    "/dashboard/numbers",
    "/dashboard/meta",
    "/dashboard/revenue",
    "/dashboard/performance",
  ];
  if (labPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return "Lab Metrics";
  }
  const assetPaths = [
    "/dashboard",
    "/dashboard/assets",
    "/dashboard/equipment",
    "/dashboard/scan",
    "/dashboard/maintenance",
    "/dashboard/refrigerator",
    "/dashboard/analytics",
    "/dashboard/reports",
  ];
  if (assetPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return "Asset Management";
  }
  return null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut, facilityAuth, facilityAuthLoading } = useAuth();
  const showRefrigeratorModule = useFlag("show-refrigerator-module");
  const showLrids = useFlag("show-lrids");
  const showAiIntelligence = useFlag("show-ai-intelligence");
  const showTatTestLevel = useFlag("show-tat-test-level");
  const hospitalName = hospitalDisplayName(facilityAuth?.hospitalName);
  const hospitalLogoUrl = facilityAuth?.hospitalLogoUrl || process.env.NEXT_PUBLIC_HOSPITAL_LOGO_URL || "";

  const navGroups = filterNavForFacilityAuth(navGroupsBase, facilityAuth, {
    loading: facilityAuthLoading,
    hasUser: !!user,
    flags: {
      showRefrigeratorModule,
      showLrids,
      showAiIntelligence,
      showTatTestLevel,
    },
  });
  const { collapsed } = useSidebarLayout();
  const [moduleAttr, setModuleAttr] = useState<string>(() => readModuleAttr());
  const isHomeHub = moduleAttr === "home";
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setModuleAttr(readModuleAttr());
  }, [pathname]);

  /** Keep exactly one collapsible group open — the one that matches the current route. */
  useEffect(() => {
    setOpenGroup(accordionGroupForPath(pathname));
  }, [pathname]);

  return (
    <aside
      className={clsx(
        // Stack above main column so the edge collapse control (-right-3.5) stays clickable;
        // TopBar is z-20 and would otherwise capture hits on the overlap strip.
        "kanta-sidebar relative z-30 flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-visible border-r border-slate-200 bg-white",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{ borderRadius: "0 28px 28px 0" }}
    >
      {/* ── Header ── */}
      <div
        className={clsx(
          "flex-shrink-0 flex items-center py-3 border-b border-slate-200",
          collapsed ? "justify-center px-0" : "px-5 gap-3"
        )}
      >
        <Link href="/dashboard/home" className={clsx("flex items-center focus:outline-none", collapsed ? "justify-center" : "gap-3")}>
          {hospitalLogoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hospitalLogoUrl} alt={hospitalName} className="flex-shrink-0 w-10 h-10 rounded-xl object-cover bg-white shadow-sm" />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight tracking-tight text-slate-900 truncate">{hospitalName}</p>
                  <p className="text-[10px] mt-1 font-normal text-slate-500">Operational Intelligence</p>
                </div>
              )}
            </>
          ) : collapsed ? (
            <Image
              src="/kanta-mark.svg"
              alt="Kanta"
              width={32}
              height={32}
              className="flex-shrink-0 rounded-xl"
              priority
            />
          ) : (
            <Image
              src="/kanta-logo.svg"
              alt="Kanta"
              width={120}
              height={32}
              className="flex-shrink-0 h-8 w-auto object-contain object-left"
              priority
            />
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
              const isOpen = openGroup === group.title;
              const sectionTint = isHomeHub ? homeGroupColor(group.title) : "#64748b";

              return (
                <div key={group.title} className="mb-2">
                  {!collapsed && (
                    <p
                      className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: sectionTint }}
                    >
                      {group.title}
                    </p>
                  )}

                  {/* Parent row: icon + label + chevron toggle */}
                  <div className="relative">
                    {/* Active module indicator (left edge) */}
                    {isCollapsibleActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full z-10 bg-[var(--sidebar-active-bg)]"
                      />
                    )}

                    <div className="flex items-center">
                      <Tooltip label={group.title} side="right" className={clsx(!collapsed && "contents")}>
                        <Link
                          href={parentHref}
                          onClick={() => {
                            if (!collapsed) {
                              setOpenGroup((prev) => (prev === group.title ? null : group.title));
                            }
                          }}
                          className={clsx(
                            "relative z-[1] flex items-center py-2.5 rounded-xl transition-all duration-150 focus:outline-none flex-1",
                            collapsed ? "justify-center px-0" : "gap-3 px-4",
                            isCollapsibleActive
                              ? clsx(
                                  "bg-[var(--sidebar-active-bg)] text-white shadow-sm",
                                  collapsed && "ring-2 ring-offset-2 ring-offset-white ring-[var(--sidebar-active-bg)]/40"
                                )
                              : "text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <ParentIcon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                          {!collapsed && (
                            <span className="truncate text-sm font-medium">{group.title}</span>
                          )}
                        </Link>
                      </Tooltip>

                      {!collapsed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setOpenGroup((prev) => (prev === group.title ? null : group.title));
                          }}
                          aria-label={isOpen ? `Collapse ${group.title}` : `Expand ${group.title}`}
                          className={clsx(
                            "relative z-[1] flex-shrink-0 p-2 rounded-lg mr-1 transition-colors",
                            isCollapsibleActive
                              ? "text-white/90 hover:bg-white/10"
                              : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          <ChevronDown
                            size={13}
                            strokeWidth={2.5}
                            className={clsx("transition-transform duration-200", isOpen && "rotate-180")}
                          />
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Sub-items — only shown when sidebar is expanded AND accordion is open */}
                  {!collapsed && isOpen && (
                    <div className="mt-1 ml-3 pl-3 border-l border-slate-200 flex flex-col gap-0.5">
                      {group.items.map(({ label, icon: Icon, href, section }, idx) => {
                        const key = href + label;
                        const subActive =
                          href === SIDEBAR_LRIDS_NAV_HREF
                            ? pathname.startsWith("/lrids")
                            : isSubLinkActive(pathname, searchParams, href);
                        const lridsFacilityId = facilityAuth?.facilityId;
                        return (
                          <div key={key}>
                            {section && (
                              <p
                                className={clsx(
                                  "pb-1 text-[10px] font-semibold uppercase tracking-widest pl-1 text-slate-500",
                                  idx === 0 ? "pt-0" : "pt-2"
                                )}
                                style={isHomeHub ? { color: sectionTint } : undefined}
                              >
                                {section}
                              </p>
                            )}
                            <div className="relative">
                              {href === SIDEBAR_LRIDS_NAV_HREF ? (
                                <button
                                  type="button"
                                  disabled={!lridsFacilityId}
                                  title={
                                    lridsFacilityId
                                      ? "Open display board in a new tab"
                                      : "No facility assigned"
                                  }
                                  onClick={() => {
                                    if (lridsFacilityId) void openLridsBoardInNewTab(lridsFacilityId);
                                  }}
                                  className={clsx(
                                    "relative z-[1] flex w-full items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 focus:outline-none text-left disabled:opacity-50 disabled:cursor-not-allowed",
                                    subActive
                                      ? "bg-[var(--sidebar-active-bg)] text-white shadow-sm"
                                      : "text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                                  <span className="truncate text-xs font-medium">{label}</span>
                                </button>
                              ) : (
                                <Link
                                  href={href}
                                  className={clsx(
                                    "relative z-[1] flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 focus:outline-none",
                                    subActive
                                      ? "bg-[var(--sidebar-active-bg)] text-white shadow-sm"
                                      : "text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                                  <span className="truncate text-xs font-medium">{label}</span>
                                </Link>
                              )}
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
                    className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                    style={isHomeHub ? { color: homeGroupColor(group.title) } : undefined}
                  >
                    {group.title}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ label, icon: Icon, href }) => {
                    const active      = isNavActive(pathname, href);
                    const itemKey     = href + label;

                    return (
                      <div key={itemKey} className="relative">
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full z-10 bg-[var(--sidebar-active-bg)]" />
                        )}
                        <Tooltip label={label} side="right" className={clsx(!collapsed && "contents")}>
                          <Link
                            href={href}
                            className={clsx(
                              "relative flex items-center py-2.5 rounded-xl transition-all duration-150 focus:outline-none z-[1]",
                              collapsed ? "justify-center px-0" : "gap-3 px-4",
                              active
                                ? "bg-[var(--sidebar-active-bg)] text-white shadow-sm"
                                : "text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                            {!collapsed && <span className="truncate text-sm font-medium">{label}</span>}
                          </Link>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-slate-200 pt-3 pb-4 px-3">
          {user && (
            <div className={clsx("flex items-center gap-3", collapsed ? "justify-center mb-3" : "mb-3")}>
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                {getInitials(user)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <p className="text-sm font-medium truncate text-slate-700">{getFirstName(user)}</p>
                  <Tooltip label="Log out">
                    <button
                      type="button"
                      onClick={() => signOut()}
                      aria-label="Log out"
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <LogOut size={16} strokeWidth={1.5} />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
          {user && collapsed && (
            <div className="flex justify-center">
              <Tooltip label="Log out" side="right">
                <button
                  type="button"
                  onClick={() => signOut()}
                  aria-label="Log out"
                  className="p-2.5 rounded-xl hover:bg-red-500/20 text-red-300 transition-colors"
                >
                  <LogOut size={20} strokeWidth={1.5} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </nav>

    </aside>
  );
}
