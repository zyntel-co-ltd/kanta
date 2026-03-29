"use client";

import { useCallback, useEffect, useState } from "react";
import { ListTodo, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type TrackerRow = {
  id: string;
  lab_number: string;
  test_name: string;
  section: string;
  priority: string;
  shift: string | null;
  unit: string | null;
  requested_at: string;
  received_at: string | null;
  resulted_at: string | null;
  status: string;
  tat_minutes: number | null;
};

export default function TrackerPage() {
  const [data, setData] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tracker?facility_id=${DEFAULT_FACILITY_ID}&page=${page}&limit=${limit}`
      );
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            TAT tracker with lab numbers, sections, and turnaround times.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tat"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← TAT
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <ListTodo size={16} className="text-emerald-600" />
          <span className="font-semibold text-slate-800">Tracker Table</span>
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center min-h-[12rem]">
            <LoadingBars />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tracker data.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Lab #</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Test</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Shift</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Requested</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Received</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Resulted</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">TAT (min)</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-medium">{r.lab_number || "—"}</td>
                      <td className="px-4 py-3">{r.test_name}</td>
                      <td className="px-4 py-3">{r.section}</td>
                      <td className="px-4 py-3">{r.shift || "—"}</td>
                      <td className="px-4 py-3">{r.unit || "—"}</td>
                      <td className="px-4 py-3">
                        {r.requested_at
                          ? new Date(r.requested_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.received_at
                          ? new Date(r.received_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.resulted_at
                          ? new Date(r.resulted_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.tat_minutes != null ? `${r.tat_minutes} min` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            r.status === "resulted"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.status === "in_progress"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
