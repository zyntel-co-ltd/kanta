"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  FlaskConical,
  Layers,
  Home,
  ShieldCheck,
  Timer,
  Binary,
  CircleDollarSign,
  TableProperties,
  TestTube,
  Wrench,
  CalendarClock,
  Thermometer,
  ScanLine,
  BarChart3,
} from "lucide-react";

type Tab = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  matchPrefixes?: string[];
  /** Pathname must equal one of these (after trailing-slash normalization) */
  matchExactPaths?: string[];
};
const LAB_TABS: Tab[] = [
  { label: "Overview", href: "/dashboard/lab-analytics", icon: FlaskConical, matchPrefixes: ["/dashboard/lab-analytics"] },
  { label: "TAT", href: "/dashboard/tat", icon: Timer, matchPrefixes: ["/dashboard/tat", "/dashboard/performance", "/dashboard/lrids"] },
  { label: "Volume", href: "/dashboard/numbers", icon: Binary, matchPrefixes: ["/dashboard/numbers"] },
  { label: "Revenue", href: "/dashboard/revenue", icon: CircleDollarSign, matchPrefixes: ["/dashboard/revenue"] },
  { label: "Tests & Lab Mgmt", href: "/dashboard/meta", icon: TableProperties, matchPrefixes: ["/dashboard/meta", "/dashboard/tests"] },
];
const QUALITY_TABS: Tab[] = [
  { label: "Overview", href: "/dashboard/quality-samples", icon: ShieldCheck, matchPrefixes: ["/dashboard/quality-samples"] },
  { label: "Quality", href: "/dashboard/qc?tab=config", icon: FlaskConical, matchPrefixes: ["/dashboard/qc"] },
  { label: "Samples", href: "/dashboard/samples?tab=dashboard", icon: TestTube, matchPrefixes: ["/dashboard/samples"] },
];
const ASSET_TABS: Tab[] = [
  { label: "Overview", href: "/dashboard/assets", icon: Layers, matchPrefixes: ["/dashboard/assets"] },
  { label: "Equipment", href: "/dashboard/equipment", icon: Wrench, matchPrefixes: ["/dashboard/equipment"] },
  { label: "Maintenance", href: "/dashboard/maintenance", icon: CalendarClock, matchPrefixes: ["/dashboard/maintenance"] },
  { label: "Refrigerator", href: "/dashboard/refrigerator", icon: Thermometer, matchPrefixes: ["/dashboard/refrigerator"] },
  { label: "Scan", href: "/dashboard/scan", icon: ScanLine, matchPrefixes: ["/dashboard/scan"] },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    matchPrefixes: ["/dashboard/analytics", "/dashboard/reports"],
    matchExactPaths: ["/dashboard"],
  },
];

function resolveTabs(pathname: string): Tab[] | null {
  if (["/dashboard/lab-analytics", "/dashboard/tat", "/dashboard/tests", "/dashboard/numbers", "/dashboard/meta", "/dashboard/revenue", "/dashboard/performance", "/dashboard/lrids"].some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return LAB_TABS;
  }
  if (["/dashboard/quality-samples", "/dashboard/qc", "/dashboard/samples"].some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return QUALITY_TABS;
  }
  if (["/dashboard", "/dashboard/assets", "/dashboard/scan", "/dashboard/equipment", "/dashboard/maintenance", "/dashboard/refrigerator", "/dashboard/analytics", "/dashboard/reports"].some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return ASSET_TABS;
  }
  return null;
}

function isTabActive(pathname: string, tab: Tab): boolean {
  const norm = pathname.replace(/\/$/, "") || "/";
  if (tab.matchExactPaths?.some((p) => norm === (p.replace(/\/$/, "") || "/"))) {
    return true;
  }
  if (!tab.matchPrefixes || tab.matchPrefixes.length === 0) return false;
  return tab.matchPrefixes.some((prefix) => {
    const pre = prefix.replace(/\/$/, "") || "/";
    return norm === pre || norm.startsWith(pre + "/");
  });
}

/* ─── Component ─── */

export default function AppTabBar() {
  const pathname = usePathname();

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
  const tabs = resolveTabs(pathname);
  if (!tabs) return null;

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

        {/* Tabs */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(pathname, tab);
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
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
