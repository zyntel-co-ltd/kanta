"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type ProgressRow = {
  lab_number: string;
  status: string;
  requested_at: string | null;
  tests: unknown[];
};

export default function ProgressPage() {
  const [data, setData] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/progress?facility_id=${DEFAULT_FACILITY_ID}&limit=100`
      );
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setData([]);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Progress
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Lab numbers with status and progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/lrids"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            LRIDS →
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
          <Activity size={16} className="text-emerald-600" />
          <span className="font-semibold text-slate-800">Progress by Lab Number</span>
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center min-h-[12rem]">
            <LoadingBars />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No progress data.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Lab #</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Requested</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tests</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={`${r.lab_number}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-medium">{r.lab_number}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === "resulted"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "in_progress"
                            ? "bg-amber-100 text-amber-700"
                            : r.status === "received"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.requested_at
                        ? new Date(r.requested_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{(r.tests as unknown[]).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
