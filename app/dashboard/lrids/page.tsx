"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import {
  FlaskConical,
  CheckCircle2,
  Loader2,
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
      <p className="text-lg font-bold tabular-nums text-white tracking-tight">
        {time.toLocaleTimeString("en-US", { hour12: true })}
      </p>
      <p className="text-xs text-cyan-300 mt-0.5">
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

/* ─── Refresh countdown (display only, no button) ─── */
function RefreshCountdown({ refreshMs }: { refreshMs: number }) {
  const [remaining, setRemaining] = useState(Math.round(refreshMs / 1000));
  useEffect(() => {
    setRemaining(Math.round(refreshMs / 1000));
    const t = setInterval(() => {
      setRemaining((r) => (r <= 1 ? Math.round(refreshMs / 1000) : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [refreshMs]);
  return <span className="tabular-nums text-xs text-slate-400">Auto-refresh in {remaining}s</span>;
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
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
        isReady
          ? "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15"
          : "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15"
      }`}
    >
      {/* Lab number */}
      <div
        className={`text-base font-mono font-bold min-w-[90px] tracking-wide flex-shrink-0 ${
          isReady ? "text-emerald-300" : "text-amber-300"
        }`}
      >
        {row.lab_number ?? "—"}
      </div>

      {/* Test + section */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{row.test_name}</p>
        <p
          className={`text-xs mt-0.5 ${
            isReady ? "text-emerald-400/70" : "text-amber-400/70"
          }`}
        >
          {row.section}
        </p>
      </div>

      {/* Status badge */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-shrink-0 ${
          isReady ? "bg-emerald-500/20" : "bg-amber-500/20"
        }`}
      >
        {isReady ? (
          <CheckCircle2 size={12} className="text-emerald-400" />
        ) : (
          <Loader2 size={12} className="text-amber-400 animate-spin" />
        )}
        <span
          className={`text-xs font-semibold ${
            isReady ? "text-emerald-300" : "text-amber-300"
          }`}
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
    <div className="max-w-[1400px] space-y-4">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ letterSpacing: "-0.025em" }}>
            LRIDS
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Laboratory Report Information Display System
          </p>
        </div>
        <RefreshCountdown refreshMs={REFRESH_MS} />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up stagger-1">
        {/* Total */}
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Users size={15} className="text-slate-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{data.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Results</p>
          </div>
        </div>
        {/* Ready */}
        <div className="rounded-xl bg-white border border-emerald-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums leading-none">{ready.length}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Ready for Collection</p>
          </div>
        </div>
        {/* In Progress */}
        <div className="rounded-xl bg-white border border-amber-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Clock size={15} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700 tabular-nums leading-none">{inProgress.length}</p>
            <p className="text-xs text-amber-600 mt-0.5">In Progress</p>
          </div>
        </div>
      </div>

      {/* ── Display board card ── */}
      <div
        className="rounded-2xl overflow-hidden animate-slide-up stagger-2"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #0c4a6e 60%, #0f172a 100%)" }}
      >
        {/* Board header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <FlaskConical size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Patient Result Status Board</p>
              <p className="text-[11px] text-cyan-300/80 mt-0.5">Auto-updating every 30 seconds</p>
            </div>
          </div>
          <LiveClock />
        </div>

        {/* Board content */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity size={28} className="text-cyan-400 animate-pulse" />
              <p className="text-sm text-slate-400">Loading results…</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ListChecks size={28} className="text-slate-600" />
              <p className="text-sm text-slate-400">No results available at this time</p>
              <p className="text-xs text-slate-500">
                Results will appear here automatically when they are ready
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Ready column */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    Ready for Collection
                  </h2>
                  <span className="ml-auto text-xs text-emerald-400/50 tabular-nums">
                    {ready.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {ready.length === 0 ? (
                    <div className="rounded-xl border border-white/10 p-6 text-center text-xs text-slate-500">
                      No results ready yet
                    </div>
                  ) : (
                    ready.map((row) => (
                      <ResultRow key={row.id} row={row} variant="ready" />
                    ))
                  )}
                </div>
              </div>

              {/* In Progress column */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    In Progress
                  </h2>
                  <span className="ml-auto text-xs text-amber-400/50 tabular-nums">
                    {inProgress.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {inProgress.length === 0 ? (
                    <div className="rounded-xl border border-white/10 p-6 text-center text-xs text-slate-500">
                      No results in progress
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
        </div>

        {/* Board footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
          <span>LRIDS — Kanta Laboratory Information System</span>
          {lastUpdated && (
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
