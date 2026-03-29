import Link from "next/link";
import {
  Wrench,
  CalendarClock,
  Thermometer,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const CARDS = [
  {
    href: "/dashboard/equipment",
    eyebrow: "Tracking",
    title: "Equipment tracking",
    body: "Track and manage hospital equipment.",
    cta: "Open Equipment",
    Icon: Wrench,
  },
  {
    href: "/dashboard/maintenance",
    eyebrow: "Service",
    title: "Maintenance",
    body: "Schedule and log maintenance.",
    cta: "Open Maintenance",
    Icon: CalendarClock,
  },
  {
    href: "/dashboard/refrigerator",
    eyebrow: "Monitoring",
    title: "Refrigerator monitoring",
    body: "Monitor cold chain temperatures.",
    cta: "Open Refrigerator",
    Icon: Thermometer,
  },
  {
    href: "/dashboard/analytics",
    eyebrow: "Insights",
    title: "Analytics & reports",
    body: "Equipment performance reports.",
    cta: "Open Analytics",
    Icon: BarChart3,
  },
];

export default function AssetWorkspacePage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-10">
      <div
        className="rounded-2xl overflow-hidden border border-slate-100/80"
        style={{ backgroundColor: "var(--module-primary-light)" }}
      >
        <div className="px-7 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest module-accent-text mb-2">Workspace</p>
          <h1 className="module-accent-text font-extrabold tracking-tight" style={{ fontSize: "var(--workspace-banner-title)", lineHeight: 1.2 }}>
            Asset management
          </h1>
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-slate-700">
            Track equipment, plan maintenance, monitor cold chain, and review performance — pick where you want to work.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
