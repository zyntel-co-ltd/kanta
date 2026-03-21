"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, AlertTriangle, BarChart3, List, RefreshCw } from "lucide-react";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";

type QueueItem = {
  id: string;
  lab_number?: string;
  test_name: string;
  section: string;
  received_at: string | null;
  elapsed_minutes: number | null;
  status: string;
};

type SectionSummary = {
  section: string;
  avg_tat: number;
  count: number;
  target: number;
  on_target: boolean;
};

type BreachItem = {
  id: string;
  breach_minutes: number;
  target_minutes: number;
  detected_at: string;
  request?: { lab_number?: string; test_name: string; section: string };
};

export default function TATPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [breaches, setBreaches] = useState<BreachItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, sRes, bRes] = await Promise.all([
        fetch(`/api/tat/queue?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/tat/summary?facility_id=${DEFAULT_FACILITY_ID}&days=7`),
        fetch(`/api/tat/breaches?facility_id=${DEFAULT_FACILITY_ID}&limit=20`),
      ]);
      const qData = await qRes.json();
      const sData = await sRes.json();
      const bData = await bRes.json();
      setQueue(qData.data ?? []);
      setSections(sData.data?.sections ?? []);
      setBreaches(bData.data ?? []);
    } catch {
      setQueue([]);
      setSections([]);
      setBreaches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TAT — Turnaround Time</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time queue, breach log, and per-section summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/lrids"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            LRIDS Display
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
          Loading...
        </div>
      ) : (
        <>
          {/* Real-time queue */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              <span className="font-semibold text-slate-800">In-Progress Queue</span>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              {queue.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No tests in progress</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Lab #</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Test</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Section</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Elapsed (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-b border-slate-50 ${
                          r.elapsed_minutes != null && r.elapsed_minutes > 60
                            ? "bg-red-50"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-mono">{r.lab_number ?? "—"}</td>
                        <td className="px-4 py-2">{r.test_name}</td>
                        <td className="px-4 py-2">{r.section}</td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              r.elapsed_minutes != null && r.elapsed_minutes > 60
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            {r.elapsed_minutes ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Per-section summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" />
                <span className="font-semibold text-slate-800">Per-Section Summary (7d)</span>
              </div>
              <div className="p-4">
                {sections.length === 0 ? (
                  <p className="text-sm text-slate-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {sections.map((s) => (
                      <div
                        key={s.section}
                        className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{s.section}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 text-sm">
                            {s.avg_tat} min avg (target: {s.target})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.on_target ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {s.on_target ? "On target" : "Over"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Breach log */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                <span className="font-semibold text-slate-800">Breach Log</span>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {breaches.length === 0 ? (
                  <p className="text-sm text-slate-500">No breaches</p>
                ) : (
                  <div className="space-y-2">
                    {breaches.map((b) => (
                      <div
                        key={b.id}
                        className="py-2 border-b border-slate-50 last:border-0 text-sm"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {b.request?.lab_number ?? "—"} · {b.request?.test_name}
                          </span>
                          <span className="text-red-600 font-semibold">
                            +{b.breach_minutes} min over target
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.request?.section} · {new Date(b.detected_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
