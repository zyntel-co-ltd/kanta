"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import clsx from "clsx";
import {
  Binary,
  ChartSpline,
  CircleDollarSign,
  Microscope,
  TableProperties,
  Timer,
  ShieldCheck,
  Activity,
  BarChart3,
  ClipboardList,
  Calculator,
  TrendingUp,
  TestTube,
  FlaskConical,
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Thermometer,
  FileText,
  Layers,
  Home,
} from "lucide-react";

type Tab = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  matchPrefixes?: string[];
};

type AppConfig = {
  name: string;
  AppIcon: ComponentType<{ size?: number; className?: string }>;
  tabs: Tab[];
};

/* ─── App definitions ─── */

const LAB_METRICS: AppConfig = {
  name: "Lab Metrics",
  AppIcon: FlaskConical,
  tabs: [
    { label: "Workspace",   href: "/dashboard/lab-analytics", icon: Layers,            matchPrefixes: ["/dashboard/lab-analytics"] },
    { label: "TAT",         href: "/dashboard/tat",         icon: Timer,             matchPrefixes: ["/dashboard/tat"] },
    { label: "Tests",       href: "/dashboard/tests",       icon: Microscope,        matchPrefixes: ["/dashboard/tests"] },
    { label: "Numbers",     href: "/dashboard/numbers",     icon: Binary,            matchPrefixes: ["/dashboard/numbers"] },
    { label: "Meta",        href: "/dashboard/meta",        icon: TableProperties,   matchPrefixes: ["/dashboard/meta"] },
    { label: "Revenue",     href: "/dashboard/revenue",     icon: CircleDollarSign,  matchPrefixes: ["/dashboard/revenue"] },
    { label: "Performance", href: "/dashboard/performance", icon: ChartSpline,       matchPrefixes: ["/dashboard/performance"] },
  ],
};

const QUALITY_MGMT: AppConfig = {
  name: "Quality Management",
  AppIcon: ShieldCheck,
  tabs: [
    { label: "Workspace",       href: "/dashboard/quality-samples",         icon: Layers,        matchPrefixes: ["/dashboard/quality-samples"] },
    { label: "QC Config",       href: "/dashboard/qc?tab=config",           icon: ShieldCheck,   matchPrefixes: ["/dashboard/qc"] },
    { label: "Data Entry",      href: "/dashboard/qc?tab=data",             icon: ClipboardList, matchPrefixes: ["/dashboard/qc"] },
    { label: "Visualization",   href: "/dashboard/qc?tab=visual",           icon: BarChart3,     matchPrefixes: ["/dashboard/qc"] },
    { label: "QC Calculator",   href: "/dashboard/qc?tab=calc",             icon: Calculator,    matchPrefixes: ["/dashboard/qc"] },
    { label: "QC Stats",        href: "/dashboard/qc?tab=stats",            icon: TrendingUp,    matchPrefixes: ["/dashboard/qc"] },
    { label: "Qual. Config",    href: "/dashboard/qc?tab=qual-config",      icon: FlaskConical,  matchPrefixes: ["/dashboard/qc"] },
    { label: "Qual. Entry",     href: "/dashboard/qc?tab=qual-entry",       icon: TestTube,      matchPrefixes: ["/dashboard/qc"] },
    { label: "Qual. Log",       href: "/dashboard/qc?tab=qual-log",         icon: Activity,      matchPrefixes: ["/dashboard/qc"] },
    { label: "Sample Dashboard",href: "/dashboard/samples?tab=dashboard",   icon: Layers,        matchPrefixes: ["/dashboard/samples"] },
  ],
};

const ASSET_MGMT: AppConfig = {
  name: "Asset Management",
  AppIcon: Layers,
  tabs: [
    { label: "Workspace",  href: "/dashboard/assets",       icon: Layers,          matchPrefixes: ["/dashboard/assets"] },
    { label: "Overview",   href: "/dashboard",              icon: LayoutDashboard, matchPrefixes: ["/dashboard$"] },
    { label: "Scan",       href: "/dashboard/scan",         icon: ScanSearch,      matchPrefixes: ["/dashboard/scan"] },
    { label: "Equipment",  href: "/dashboard/equipment",    icon: ScanLine,        matchPrefixes: ["/dashboard/equipment"] },
    { label: "Maintenance",href: "/dashboard/maintenance",  icon: Wrench,          matchPrefixes: ["/dashboard/maintenance"] },
    { label: "Refrigerator",href:"/dashboard/refrigerator", icon: Thermometer,     matchPrefixes: ["/dashboard/refrigerator"] },
    { label: "Analytics",  href: "/dashboard/analytics",   icon: BarChart3,       matchPrefixes: ["/dashboard/analytics"] },
    { label: "Reports",    href: "/dashboard/reports",      icon: FileText,        matchPrefixes: ["/dashboard/reports"] },
  ],
};

/* ─── Path → App resolver ─── */

function resolveApp(pathname: string): AppConfig | null {
  const labPrefixes = [
    "/dashboard/lab-analytics",
    "/dashboard/tat",
    "/dashboard/tests",
    "/dashboard/numbers",
    "/dashboard/meta",
    "/dashboard/revenue",
    "/dashboard/performance",
  ];
  const qcPrefixes  = ["/dashboard/qc", "/dashboard/quality-samples", "/dashboard/samples"];
  const assetPrefixes = [
    "/dashboard/scan",
    "/dashboard/equipment",
    "/dashboard/maintenance",
    "/dashboard/refrigerator",
    "/dashboard/analytics",
    "/dashboard/reports",
  ];

  if (labPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return LAB_METRICS;
  if (qcPrefixes.some((p)  => pathname === p || pathname.startsWith(p + "/"))) return QUALITY_MGMT;
  if (assetPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return ASSET_MGMT;
  if (pathname === "/dashboard") return ASSET_MGMT;

  return null;
}

function isTabActive(pathname: string, tab: Tab): boolean {
  if (!tab.matchPrefixes || tab.matchPrefixes.length === 0) return false;
  return tab.matchPrefixes.some((prefix) => {
    if (prefix === "/dashboard$") return pathname === "/dashboard";
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

/* ─── Component ─── */

export default function AppTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Don't show on homepage or other system pages
  if (
    pathname === "/dashboard/home" ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/departments") ||
    pathname.startsWith("/dashboard/reception") ||
    pathname.startsWith("/dashboard/tracker") ||
    pathname.startsWith("/dashboard/progress") ||
    pathname.startsWith("/dashboard/lrids")
  ) {
    return null;
  }

  const app = resolveApp(pathname);
  if (!app) return null;

  const { AppIcon } = app;

  return (
    <div className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-0">
      <div className="flex items-center gap-4">

        {/* Back to home */}
        <Link
          href="/dashboard/home"
          className="flex items-center gap-1.5 py-3 pr-4 border-r border-slate-200 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
          style={{ fontSize: "0.75rem", fontWeight: 500 }}
        >
          <Home size={13} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {/* App badge */}
        <div className="flex items-center gap-2 py-3 pr-4 border-r border-slate-200 flex-shrink-0">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--module-primary-dark) 0%, var(--module-primary) 100%)" }}
          >
            <AppIcon size={12} className="text-white" />
          </div>
          <span
            className="hidden md:block font-semibold text-slate-700"
            style={{ fontSize: "0.8125rem", letterSpacing: "-0.01em" }}
          >
            {app.name}
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none py-2">
          {app.tabs.map((tab) => {
            const Icon = tab.icon;
            const [base, qs] = tab.href.split("?");
            const expectedTab = qs ? new URLSearchParams(qs).get("tab") : null;
            const active =
              expectedTab !== null
                ? pathname === base && searchParams.get("tab") === expectedTab
                : isTabActive(pathname, tab);
            return (
              <Link
                key={tab.label + tab.href}
                href={tab.href}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex-shrink-0",
                  active ? "text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                )}
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: active ? 600 : 500,
                  ...(active ? { backgroundColor: "var(--module-primary)" } : {}),
                }}
              >
                <Icon size={13} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
