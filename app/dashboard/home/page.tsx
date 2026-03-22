import Link from "next/link";
import {
  Clock,
  Beaker,
  Hash,
  Database,
  DollarSign,
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Thermometer,
  BarChart3,
  ArrowRight,
  Activity,
  FlaskConical,
  Layers,
  Zap,
} from "lucide-react";

/* ─────────────────────────── types ─────────────────────────── */

type SubTab = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type AppCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;       // Tailwind border/text accent class
  accentBg: string;     // icon bg
  pillBg: string;
  pillText: string;
  iconGradient: string; // gradient for icon circle
  tabs: SubTab[];
};

/* ─────────────────────────── data ─────────────────────────── */

const apps: AppCard[] = [
  {
    eyebrow: "Lab Intelligence",
    title: "Lab Metrics",
    description:
      "Monitor turnaround times, test volumes, patient numbers, test catalogue and revenue — all in one place.",
    href: "/dashboard/tat",
    icon: FlaskConical,
    accent: "border-emerald-400",
    accentBg: "bg-emerald-50",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    iconGradient: "from-emerald-500 to-emerald-700",
    tabs: [
      { label: "TAT", href: "/dashboard/tat", icon: Clock },
      { label: "Tests", href: "/dashboard/tests", icon: Beaker },
      { label: "Numbers", href: "/dashboard/numbers", icon: Hash },
      { label: "Meta", href: "/dashboard/meta", icon: Database },
      { label: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
    ],
  },
  {
    eyebrow: "Clinical Excellence",
    title: "Quality Management",
    description:
      "Run Westgard rules, plot Levey-Jennings charts and manage qualitative QC to keep results accurate and compliant.",
    href: "/dashboard/qc",
    icon: ShieldCheck,
    accent: "border-emerald-500",
    accentBg: "bg-emerald-50",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    iconGradient: "from-emerald-600 to-emerald-800",
    tabs: [
      { label: "QC Overview", href: "/dashboard/qc", icon: ShieldCheck },
      { label: "L-J Charts", href: "/dashboard/qc", icon: Activity },
      { label: "Westgard", href: "/dashboard/qc", icon: BarChart3 },
      { label: "Qualitative QC", href: "/dashboard/qc", icon: FlaskConical },
    ],
  },
  {
    eyebrow: "Operations",
    title: "Asset Management",
    description:
      "Track every piece of equipment, schedule maintenance, monitor cold-chain temperatures and review fleet analytics.",
    href: "/dashboard",
    icon: Layers,
    accent: "border-emerald-400",
    accentBg: "bg-emerald-50",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    iconGradient: "from-emerald-500 to-emerald-700",
    tabs: [
      { label: "Assets Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Scan", href: "/dashboard/scan", icon: ScanSearch },
      { label: "Equipment", href: "/dashboard/equipment", icon: ScanLine },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
      { label: "Refrigerator", href: "/dashboard/refrigerator", icon: Thermometer },
      { label: "Analytics & Reports", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
];

/* ─────────────────────────── component ─────────────────────────── */

export default function DashboardHomePage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-10">

      {/* ── Login-page emerald hero banner ── */}
      <div
        className="rounded-2xl overflow-hidden animate-slide-up stagger-1"
        style={{ background: "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)" }}
      >
        <div className="px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap size={17} className="text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
                Kanta · Operational Intelligence
              </span>
            </div>
            <h1
              className="text-white"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}
            >
              Welcome back
            </h1>
            <p className="text-emerald-100 mt-1.5" style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Choose a workspace below — data, charts and controls in one focused view.
            </p>
          </div>
          {/* Quick metric strip */}
          <div className="flex sm:flex-col gap-3 sm:gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">System Online</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <span className="text-xs text-emerald-200">3 modules active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3 App Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-slide-up stagger-2">
        {apps.map((app) => {
          const AppIcon = app.icon;
          return (
            <Link
              key={app.title}
              href={app.href}
              className={`relative flex flex-col rounded-2xl bg-white border-2 ${app.accent} shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 hover:border-emerald-500/80 transition-all duration-300 overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2`}
              style={{ minHeight: 320 }}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-80"
                style={{ background: "linear-gradient(90deg, #065f46 0%, #047857 50%, #059669 100%)" }}
              />

              {/* Decorative gradient blob */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300 pointer-events-none"
                style={{ background: "radial-gradient(circle, #047857, transparent 70%)" }}
              />

              <div className="relative flex flex-col flex-1 p-6 pt-7">

                {/* Icon + eyebrow */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.iconGradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 group-hover:shadow-lg transition-transform duration-300`}>
                    <AppIcon size={22} className="text-white drop-shadow-sm" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-1">{app.eyebrow}</span>
                </div>

                {/* Title */}
                <h2 className="text-slate-900 mb-2 group-hover:text-emerald-800 transition-colors duration-200" style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                  {app.title}
                </h2>

                {/* Description */}
                <p className="flex-1 text-slate-500" style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                  {app.description}
                </p>

                {/* Sub-tab pills */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {app.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <span
                        key={tab.href + tab.label}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-100 ${app.pillBg} ${app.pillText}`}
                        style={{ fontSize: "0.6875rem", fontWeight: 600 }}
                      >
                        <TabIcon size={9} className="opacity-80" />
                        {tab.label}
                      </span>
                    );
                  })}
                </div>

                {/* Divider + CTA row */}
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-emerald-600 transition-colors duration-200">
                    <span className="text-sm font-semibold">Open {app.title}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom tagline ── */}
      <div className="animate-slide-up stagger-4 border-t border-slate-100 pt-5">
        <p style={{ fontSize: "0.8125rem", fontWeight: 400, color: "#94a3b8" }}>
          Kanta · QR-first asset intelligence for East African laboratories ·{" "}
          <span style={{ fontWeight: 600, color: "#047857" }}>Offline-capable</span>
        </p>
      </div>
    </div>
  );
}
