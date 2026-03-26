import Link from "next/link";
import {
  LayoutDashboard,
  ScanSearch,
  ScanLine,
  Wrench,
  Thermometer,
  BarChart3,
  FileText,
  ArrowRight,
} from "lucide-react";

const CARDS = [
  {
    href: "/dashboard",
    eyebrow: "Overview",
    title: "Assets overview",
    body: "Fleet status, scan activity, and operational KPIs — centralized for your facility.",
    cta: "Open Overview",
    Icon: LayoutDashboard,
  },
  {
    href: "/dashboard/scan",
    eyebrow: "Operations",
    title: "Scan",
    body: "Capture and validate equipment scans — feeding tracking and compliance workflows.",
    cta: "Open Scan",
    Icon: ScanSearch,
  },
  {
    href: "/dashboard/equipment",
    eyebrow: "Inventory",
    title: "Equipment",
    body: "Asset records, metadata, and lifecycle visibility — managed in one equipment workspace.",
    cta: "Open Equipment",
    Icon: ScanLine,
  },
  {
    href: "/dashboard/maintenance",
    eyebrow: "Service",
    title: "Maintenance",
    body: "Preventive and corrective maintenance scheduling — planned and tracked per asset.",
    cta: "Open Maintenance",
    Icon: Wrench,
  },
  {
    href: "/dashboard/refrigerator",
    eyebrow: "Cold chain",
    title: "Refrigerator",
    body: "Temperature monitoring, breach alerts, and unit health signals — for cold-chain operations.",
    cta: "Open Refrigerator",
    Icon: Thermometer,
  },
  {
    href: "/dashboard/analytics",
    eyebrow: "Insights",
    title: "Analytics",
    body: "Trend, utilization, and performance analysis — across core asset operations.",
    cta: "Open Analytics",
    Icon: BarChart3,
  },
  {
    href: "/dashboard/reports",
    eyebrow: "Reporting",
    title: "Reports",
    body: "Operational reporting for stakeholders and audits — generated from module activity.",
    cta: "Open Reports",
    Icon: FileText,
  },
];

export default function AssetWorkspacePage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-10">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, var(--module-primary-dark) 0%, var(--module-primary) 100%)" }}
      >
        <div className="px-7 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest module-accent-soft-text mb-2">Workspace</p>
          <h1 className="text-white font-extrabold tracking-tight" style={{ fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)", lineHeight: 1.2 }}>
            Asset management
          </h1>
          <p className="module-accent-soft-text mt-2 max-w-xl text-[0.9375rem] leading-relaxed">
            Manage scans, equipment, maintenance, cold-chain, and reporting — pick where you want to work.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CARDS.map(({ href, eyebrow, title, body, cta, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 module-accent-ring"
          >
            <div className="px-6 py-5 flex items-center gap-4 bg-slate-50 border-b border-slate-200">
              <div className="w-11 h-11 rounded-xl module-accent-bg flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon size={22} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{eyebrow}</p>
                <h2 className="text-slate-900 font-semibold text-lg leading-tight">{title}</h2>
              </div>
            </div>
            <div className="flex flex-col flex-1 p-6 gap-4">
              <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
              <div className="module-cta flex items-center gap-1 text-slate-700 text-sm font-semibold mt-auto pt-2">
                {cta}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-150" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
