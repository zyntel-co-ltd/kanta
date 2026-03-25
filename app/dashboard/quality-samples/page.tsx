import Link from "next/link";
import { ShieldCheck, Package, ArrowRight } from "lucide-react";

/**
 * Hub for the combined "Quality & samples" workspace.
 * Same visual system as home: slate structure + brand emerald icons only.
 */
export default function QualitySamplesHubPage() {
  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-10">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #042f2e 0%, #065f46 55%, #047857 100%)" }}
      >
        <div className="px-7 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200 mb-2">
            Workspace
          </p>
          <h1
            className="text-white font-extrabold tracking-tight"
            style={{ fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)", lineHeight: 1.2 }}
          >
            Quality & samples
          </h1>
          <p className="text-emerald-100 mt-2 max-w-xl text-[0.9375rem] leading-relaxed">
            Configure QC, enter results, and track racks and specimen flow — pick where you want to work.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/qc"
          className="group flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
        >
          <div className="px-6 py-5 flex items-center gap-4 bg-slate-50 border-b border-slate-200">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <ShieldCheck size={22} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Quality control</p>
              <h2 className="text-slate-900 font-semibold text-lg leading-tight">QC & compliance</h2>
            </div>
          </div>
          <div className="flex flex-col flex-1 p-6 gap-4">
            <p className="text-slate-600 text-sm leading-relaxed">
              Config, data entry, Levey-Jennings, qualitative runs, calculators, and stats — connected to your Lab-hub
              workflow when configured.
            </p>
            <div className="flex items-center gap-1 text-slate-700 group-hover:text-emerald-700 text-sm font-semibold mt-auto pt-2">
              Open QC
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-150" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/samples?tab=dashboard"
          className="group flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
        >
          <div className="px-6 py-5 flex items-center gap-4 bg-slate-50 border-b border-slate-200">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Package size={22} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Specimen logistics</p>
              <h2 className="text-slate-900 font-semibold text-lg leading-tight">Sample management</h2>
            </div>
          </div>
          <div className="flex flex-col flex-1 p-6 gap-4">
            <p className="text-slate-600 text-sm leading-relaxed">
              Racks, pending discards, search, and inventory views — stored in Kanta (Supabase) for your facility.
            </p>
            <div className="flex items-center gap-1 text-slate-700 group-hover:text-emerald-700 text-sm font-semibold mt-auto pt-2">
              Open samples
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-150" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
