"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import {
  FlaskConical,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Activity,
  Users,
  ListChecks,
  Clock,
} from "lucide-react";

const REFRESH_MS = 30_000;

type LRIDSItem = {
  id: string;
  lab_number?: string;
  test_name: string;
  section: string;
  status: string;
  resulted_at?: string;
};

/* ─── Live clock ─── */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-3xl font-bold tabular-nums text-white tracking-tight">
        {time.toLocaleTimeString("en-US", { hour12: true })}
      </p>
      <p className="text-sm text-cyan-300 mt-0.5">
        {time.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

/* ─── Refresh countdown ─── */
function RefreshCountdown({ refreshMs }: { refreshMs: number }) {
  const [remaining, setRemaining] = useState(Math.round(refreshMs / 1000));
  useEffect(() => {
    setRemaining(Math.round(refreshMs / 1000));
    const t = setInterval(() => {
      setRemaining((r) => (r <= 1 ? Math.round(refreshMs / 1000) : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [refreshMs]);
  return <span className="text-cyan-400 tabular-nums">Refreshing in {remaining}s</span>;
}

/* ─── Stat pill ─── */
function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl ${color}`}>
      <Icon size={18} className="flex-shrink-0" />
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        <p className="text-xs opacity-75 mt-0.5 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

/* ─── Result row ─── */
function ResultRow({
  row,
  variant,
}: {
  row: LRIDSItem;
  variant: "ready" | "pending";
}) {
  const isReady = variant === "ready";
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl px-6 py-4 transition-all ${
        isReady
          ? "bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15"
          : "bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15"
      }`}
    >
      {/* Lab number — large monospace */}
      <div
        className={`text-4xl font-mono font-black min-w-[130px] tracking-tight ${
          isReady ? "text-emerald-300" : "text-amber-300"
        }`}
      >
        {row.lab_number ?? "—"}
      </div>

      {/* Test + section */}
      <div className="flex-1 min-w-0">
        <p className="text-lg text-white font-semibold truncate">{row.test_name}</p>
        <p className={`text-sm mt-0.5 ${isReady ? "text-emerald-400" : "text-amber-400"}`}>
          {row.section}
        </p>
      </div>

      {/* Status badge */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 ${
          isReady ? "bg-emerald-500/20" : "bg-amber-500/20"
        }`}
      >
        {isReady ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : (
          <Loader2 size={16} className="text-amber-400 animate-spin" />
        )}
        <span
          className={`font-semibold text-base ${isReady ? "text-emerald-300" : "text-amber-300"}`}
        >
          {isReady ? "Ready" : "In Progress"}
        </span>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function LRIDSPage() {
  const [data, setData] = useState<LRIDSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tat/lrids?facility_id=${DEFAULT_FACILITY_ID}&limit=100`
      );
      const json = await res.json();
      setData(json.data ?? []);
      setLastUpdated(new Date());
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchData]);

  const ready = data.filter((d) => d.status === "resulted");
  const inProgress = data.filter((d) => d.status !== "resulted");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(145deg, #0f172a 0%, #0c4a6e 45%, #164e63 75%, #0f172a 100%)",
      }}
    >
      {/* ── Header ── */}
      <header className="flex-shrink-0 px-8 py-6 border-b border-white/10">
        {/* Top row: branding + clock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-cyan-500 shadow-lg shadow-cyan-500/30">
              <FlaskConical size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Laboratory Report Information Display
              </h1>
              <p className="text-cyan-300 text-sm mt-0.5">
                Patient Result Status Board · Auto-updating
              </p>
            </div>
          </div>
          <LiveClock />
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <StatPill icon={Users} label="Total Results" value={data.length} color="bg-white/10 text-white" />
          <StatPill
            icon={CheckCircle2}
            label="Ready for Collection"
            value={ready.length}
            color="bg-emerald-500/20 text-emerald-300"
          />
          <StatPill
            icon={Clock}
            label="In Progress"
            value={inProgress.length}
            color="bg-amber-500/20 text-amber-300"
          />
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
            <RefreshCw size={13} />
            <RefreshCountdown refreshMs={REFRESH_MS} />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-8 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Activity size={52} className="text-cyan-400 animate-pulse" />
            <p className="text-2xl text-slate-300">Loading results…</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <ListChecks size={52} className="text-slate-500" />
            <p className="text-2xl text-slate-400">No results available at this time</p>
            <p className="text-sm text-slate-500 mt-1">
              Results will appear here automatically when they are ready
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* ── Ready column ── */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-base font-bold text-emerald-400 uppercase tracking-widest">
                  Ready for Collection
                </h2>
                <span className="ml-auto text-sm text-emerald-400/60 tabular-nums">
                  {ready.length} result{ready.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {ready.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 p-10 text-center text-slate-500">
                    No results ready for collection yet
                  </div>
                ) : (
                  ready.map((row) => (
                    <ResultRow key={row.id} row={row} variant="ready" />
                  ))
                )}
              </div>
            </div>

            {/* ── In Progress column ── */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <h2 className="text-base font-bold text-amber-400 uppercase tracking-widest">
                  In Progress
                </h2>
                <span className="ml-auto text-sm text-amber-400/60 tabular-nums">
                  {inProgress.length} result{inProgress.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {inProgress.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 p-10 text-center text-slate-500">
                    No results currently in progress
                  </div>
                ) : (
                  inProgress.map((row) => (
                    <ResultRow key={row.id} row={row} variant="pending" />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 px-8 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
        <span>LRIDS — Kanta Laboratory Information System</span>
        {lastUpdated && (
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </footer>
    </div>
  );
}
