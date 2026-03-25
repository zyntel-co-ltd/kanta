"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import {
  FlaskConical,
  CheckCircle2,
  Loader2,
  Activity,
  ListChecks,
  ArrowLeft,
} from "lucide-react";

const REFRESH_MS = 30_000;

const HOSPITAL_NAME =
  process.env.NEXT_PUBLIC_HOSPITAL_NAME?.trim() || "Zyntel Hospital";

type LRIDSItem = {
  id: string;
  lab_number?: string;
  test_name: string;
  section: string;
  status: string;
  resulted_at?: string;
};

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
      <p className="text-xs text-slate-400 mt-0.5">
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

function RefreshCountdown({ refreshMs }: { refreshMs: number }) {
  const [remaining, setRemaining] = useState(Math.round(refreshMs / 1000));
  useEffect(() => {
    setRemaining(Math.round(refreshMs / 1000));
    const t = setInterval(() => {
      setRemaining((r) => (r <= 1 ? Math.round(refreshMs / 1000) : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [refreshMs]);
  return (
    <span className="tabular-nums text-xs text-slate-500">Auto-refresh in {remaining}s</span>
  );
}

/** Status semantic: ok = ready (#059669), warn = in progress (#d97706) — not brand decoration */
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
          ? "bg-emerald-950/40 border border-[#059669]/35 hover:bg-emerald-950/55"
          : "bg-amber-950/30 border border-[#d97706]/35 hover:bg-amber-950/45"
      }`}
    >
      <div
        className={`text-base font-mono font-bold min-w-[90px] tracking-wide flex-shrink-0 ${
          isReady ? "text-[#34d399]" : "text-[#fbbf24]"
        }`}
      >
        {row.lab_number ?? "—"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{row.test_name}</p>
        <p
          className={`text-xs mt-0.5 ${isReady ? "text-emerald-300/80" : "text-amber-200/80"}`}
        >
          {row.section}
        </p>
      </div>

      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-shrink-0 ${
          isReady ? "bg-[#059669]/25" : "bg-[#d97706]/25"
        }`}
      >
        {isReady ? (
          <CheckCircle2 size={12} className="text-[#6ee7b7]" />
        ) : (
          <Loader2 size={12} className="text-[#fcd34d] animate-spin" />
        )}
        <span
          className={`text-xs font-semibold ${isReady ? "text-emerald-200" : "text-amber-100"}`}
        >
          {isReady ? "Ready" : "In Progress"}
        </span>
      </div>
    </div>
  );
}

/**
 * LRIDS — Option B: fullscreen display mode (no sidebar / top bar).
 * Display palette is intentionally separate from the main dashboard; exit returns to the app shell.
 */
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
    <div className="flex flex-col h-full min-h-[100dvh] text-slate-100">
      {/* Display chrome — brand emerald only on exit control */}
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-slate-950/95 backdrop-blur-md z-10">
        <Link
          href="/dashboard/home"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={2} />
          Exit to dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="text-right sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Display mode
            </p>
            <p className="text-sm font-medium text-slate-300">{HOSPITAL_NAME}</p>
          </div>
          <LiveClock />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-[1400px] mx-auto space-y-4">
          <div className="flex items-center justify-between animate-slide-up">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight" style={{ letterSpacing: "-0.025em" }}>
                LRIDS
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Laboratory Report Information Display System
              </p>
            </div>
            <RefreshCountdown refreshMs={REFRESH_MS} />
          </div>

          {/* Compact stats — slate shells; numbers use status semantics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up stagger-1">
            <div className="rounded-xl bg-slate-900/80 border border-slate-700/80 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <ListChecks size={15} className="text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white tabular-nums leading-none">{data.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total results</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-[#059669]/30 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#059669]/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={15} className="text-[#34d399]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none text-[#6ee7b7]">{ready.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Ready for collection</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-[#d97706]/30 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#d97706]/20 flex items-center justify-center flex-shrink-0">
                <Activity size={15} className="text-[#fbbf24]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none text-[#fcd34d]">{inProgress.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">In progress</p>
              </div>
            </div>
          </div>

          {/* Board — display-only palette (dark navy) */}
          <div
            className="rounded-2xl overflow-hidden animate-slide-up stagger-2 border border-slate-700/80"
            style={{ background: "linear-gradient(145deg, #0f172a 0%, #0c4a6e 55%, #0f172a 100%)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <FlaskConical size={16} className="text-slate-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Patient result status board</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Auto-updating every 30 seconds</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Activity size={28} className="text-slate-500 animate-pulse" />
                  <p className="text-sm text-slate-500">Loading results…</p>
                </div>
              ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ListChecks size={28} className="text-slate-600" />
                  <p className="text-sm text-slate-500">No results available at this time</p>
                  <p className="text-xs text-slate-600">
                    Results will appear here automatically when they are ready
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse flex-shrink-0" />
                      <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                        Ready for collection
                      </h2>
                      <span className="ml-auto text-xs text-emerald-500/70 tabular-nums">{ready.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {ready.length === 0 ? (
                        <div className="rounded-xl border border-white/10 p-6 text-center text-xs text-slate-500">
                          No results ready yet
                        </div>
                      ) : (
                        ready.map((row) => <ResultRow key={row.id} row={row} variant="ready" />)
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#d97706] flex-shrink-0" />
                      <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                        In progress
                      </h2>
                      <span className="ml-auto text-xs text-amber-500/70 tabular-nums">{inProgress.length}</span>
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

            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
              <span>LRIDS — Kanta Laboratory Information System</span>
              {lastUpdated && (
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
