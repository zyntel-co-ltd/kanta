"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

type TestRow = {
  id: string;
  test_name: string;
  section: string;
  status: string;
  requested_at: string | null;
  received_at: string | null;
  resulted_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s.includes("result") || s.includes("completed") || s === "on time")
    return "bg-emerald-50 text-emerald-800";
  if (s.includes("cancel")) return "bg-red-50 text-red-800";
  if (s.includes("pending")) return "bg-slate-100 text-slate-700";
  return "bg-blue-50 text-blue-800";
}

type Props = {
  facilityId: string;
  labNumber: string | null;
  open: boolean;
  onClose: () => void;
};

export default function TestsForLabDialog({ facilityId, labNumber, open, onClose }: Props) {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!labNumber || !facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ facility_id: facilityId, lab_number: labNumber });
      const res = await fetch(`/api/tat/tests-for-lab?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to load");
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, labNumber]);

  useEffect(() => {
    if (open) void load();
    else setRows([]);
  }, [open, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Tests for Lab ${labNumber ?? ""}`}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Tests for Lab Number <span className="font-mono text-[var(--module-primary)]">{labNumber ?? "—"}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Double-click any lab number to view all associated tests</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading tests…</span>
            </div>
          ) : error ? (
            <div className="px-5 py-4 text-sm text-red-700">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              No tests found for this lab number.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Test Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Section</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Requested</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time In</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Time Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.test_name}</td>
                    <td className="px-4 py-3 text-slate-700">{r.section}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(r.requested_at)}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {fmt(r.section_time_in ?? r.received_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {fmt(r.section_time_out ?? r.resulted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 text-xs text-slate-500">
          {rows.length} test{rows.length !== 1 ? "s" : ""} · Double-click any lab number in the table to view its tests
        </div>
      </div>
    </div>
  );
}
