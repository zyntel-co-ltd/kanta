"use client";

import { useEffect, useState } from "react";
import { Sparkles, Brain, BarChart3, Calendar, Mail, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import AnomalyPanel from "@/components/ai/AnomalyPanel";
import NLQueryBar from "@/components/ai/NLQueryBar";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

type WeeklySummary = {
  id: string;
  week_start: string;
  week_end: string;
  summary_md: string;
  top_anomalies: unknown[];
  kpi_snapshot: { volume_by_section?: { section: string; count: number; avg_tat: number }[] };
  generated_at: string;
  emailed_at: string | null;
};

function MarkdownBody({ md }: { md: string }) {
  return (
    <div className="prose prose-sm max-w-none text-slate-700">
      {md.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-bold text-slate-900 mt-4 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-base font-bold text-slate-900 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith("- ")) return <p key={i} className="text-sm text-slate-700 ml-3 mb-0.5">• {line.slice(2)}</p>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-sm font-semibold text-slate-800">{line.slice(2, -2)}</p>;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm text-slate-700 mb-0.5 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

function SummaryCard({ summary }: { summary: WeeklySummary }) {
  const [open, setOpen] = useState(false);
  const weekLabel = `${new Date(summary.week_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(summary.week_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Calendar size={15} className="text-emerald-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">{weekLabel}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">
                Generated {new Date(summary.generated_at).toLocaleDateString()}
              </p>
              {summary.emailed_at && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <Mail size={9} /> Emailed
                </span>
              )}
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* KPI snapshot */}
          {summary.kpi_snapshot?.volume_by_section && summary.kpi_snapshot.volume_by_section.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Volume This Week</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {summary.kpi_snapshot.volume_by_section.map((s) => (
                  <div key={s.section} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500 truncate">{s.section}</p>
                    <p className="text-sm font-bold text-slate-800">{s.count.toLocaleString()}</p>
                    {s.avg_tat && <p className="text-[10px] text-slate-400">avg {s.avg_tat} min</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Markdown body */}
          <MarkdownBody md={summary.summary_md} />
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSummaries = async () => {
    setLoadingSummaries(true);
    try {
      const res = await fetch(`/api/ai/weekly-summary?facility_id=${DEFAULT_FACILITY_ID}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries ?? []);
      }
    } finally {
      setLoadingSummaries(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, []);

  const generateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facility_id: DEFAULT_FACILITY_ID }),
      });
      if (res.ok) await fetchSummaries();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Brain size={18} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Kanta Intelligence</h1>
          </div>
          <p className="text-sm text-slate-500 ml-11">AI-powered operational insights. No patient data.</p>
        </div>
        <div className="flex items-center gap-2">
          <NLQueryBar facilityId={DEFAULT_FACILITY_ID} />
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: BarChart3, color: "amber", label: "TAT Anomaly Detection", desc: "Z-score flagging against 90-day rolling baseline" },
          { icon: Sparkles, color: "emerald", label: "Natural Language Queries", desc: "Ask questions in plain English about your data" },
          { icon: Calendar, color: "emerald", label: "Weekly Summaries", desc: "Auto-generated every Monday, delivered by email" },
        ].map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className={`rounded-2xl border border-${color}-100 bg-${color}-50/50 p-4`}>
            <Icon size={16} className={`text-${color}-600 mb-2`} />
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Anomaly panel — spans 3 cols */}
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Live Anomaly Flags</p>
          <AnomalyPanel facilityId={DEFAULT_FACILITY_ID} days={7} />
        </div>

        {/* Weekly summaries — spans 2 cols */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weekly Summaries</p>
            <button
              onClick={generateNow}
              disabled={generating}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium hover:text-emerald-800 disabled:opacity-50"
            >
              <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating…" : "Generate now"}
            </button>
          </div>
          {loadingSummaries ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white border border-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : summaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <Calendar size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No summaries yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Summaries auto-generate every Monday, or click &ldquo;Generate now&rdquo; above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summaries.map((s) => <SummaryCard key={s.id} summary={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
