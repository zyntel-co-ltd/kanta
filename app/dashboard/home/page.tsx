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
  gradient: string;
  iconBg: string;
  ring: string;
  pill: string;
  pillText: string;
  ctaColor: string;
  tabs: SubTab[];
  blob: string;
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
    gradient: "from-indigo-500 to-indigo-700",
    iconBg: "bg-indigo-50",
    ring: "ring-indigo-100",
    pill: "bg-indigo-50",
    pillText: "text-indigo-700",
    ctaColor: "bg-indigo-600 hover:bg-indigo-700 text-white",
    blob: "from-indigo-100/60 to-blue-100/40",
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
    gradient: "from-emerald-500 to-emerald-700",
    iconBg: "bg-emerald-50",
    ring: "ring-emerald-100",
    pill: "bg-emerald-50",
    pillText: "text-emerald-700",
    ctaColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    blob: "from-emerald-100/60 to-teal-100/40",
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
    gradient: "from-orange-500 to-orange-700",
    iconBg: "bg-orange-50",
    ring: "ring-orange-100",
    pill: "bg-orange-50",
    pillText: "text-orange-700",
    ctaColor: "bg-orange-600 hover:bg-orange-700 text-white",
    blob: "from-orange-100/60 to-amber-100/40",
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
    <div className="max-w-[1280px] mx-auto space-y-10 pb-10">

      {/* ── Hero Header ── */}
      <div className="animate-slide-up stagger-1 pt-2">
        <p className="text-eyebrow mb-3">Kanta · Operational Intelligence</p>
        <h1
          className="text-heading"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            color: "#0f172a",
          }}
        >
          Welcome to&nbsp;
          <span style={{ color: "#0f172a" }}>Kanta</span>
        </h1>
        <p
          className="mt-3 max-w-xl"
          style={{
            fontSize: "1.0625rem",
            fontWeight: 400,
            color: "#64748b",
            lineHeight: 1.65,
          }}
        >
          Choose a workspace below. Each app bundles everything you need for that
          domain — data, charts and controls — in one focused view.
        </p>
      </div>

      {/* ── 3 App Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger-2">
        {apps.map((app) => {
          const AppIcon = app.icon;
          return (
            <Link
              key={app.title}
              href={app.href}
              className="relative flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              style={{ minHeight: 340 }}
            >
              {/* Top accent band */}
              <div className={`h-1 w-full bg-gradient-to-r ${app.gradient} flex-shrink-0`} />

              <div className="relative flex flex-col flex-1 p-6">
                {/* Icon + eyebrow */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{app.eyebrow}</span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <AppIcon size={18} className="text-white" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-slate-900 mb-2" style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
                  {app.title}
                </h2>

                {/* Description */}
                <p className="flex-1 text-slate-500" style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
                  {app.description}
                </p>

                {/* Quick-access sub-links */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {app.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <span
                        key={tab.href + tab.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${app.pill} ${app.pillText}`}
                        style={{ fontSize: "0.7rem", fontWeight: 600 }}
                      >
                        <TabIcon size={10} />
                        {tab.label}
                      </span>
                    );
                  })}
                </div>

                {/* Arrow hint */}
                <div className="flex items-center gap-1.5 mt-5 text-slate-400 group-hover:text-slate-700 transition-colors">
                  <span className="text-sm font-medium">Open {app.title}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Bottom tagline ── */}
      <div className="animate-slide-up stagger-4 border-t border-slate-100 pt-6">
        <p
          style={{
            fontSize: "0.8125rem",
            fontWeight: 400,
            color: "#94a3b8",
          }}
        >
          Kanta · QR-first asset intelligence for East African laboratories ·{" "}
          <span style={{ fontWeight: 600, color: "#059669" }}>Offline-capable</span>
        </p>
      </div>
    </div>
  );
}
