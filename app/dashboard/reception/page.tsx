"use client";

import { useEffect, useState } from "react";
import { Table2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { LoadingBars } from "@/components/ui/PageLoader";

type ReceptionRow = {
  id: string;
  lab_number: string;
  test_name: string;
  section: string;
  priority: string;
  status: string;
  requested_at: string;
  received_at: string | null;
};

export default function ReceptionPage() {
  const [data, setData] = useState<ReceptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reception?facility_id=${DEFAULT_FACILITY_ID}&limit=100`
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
            Reception
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pending, received, and in-progress tests.
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
          <Table2 size={16} className="text-emerald-600" />
          <span className="font-semibold text-slate-800">Reception Queue</span>
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center min-h-[12rem]">
            <LoadingBars />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tests in reception queue.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Lab #</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Test</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Requested</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Received</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-medium">{r.lab_number || "—"}</td>
                    <td className="px-4 py-3">{r.test_name}</td>
                    <td className="px-4 py-3">{r.section}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          r.priority === "stat"
                            ? "bg-red-100 text-red-700"
                            : r.priority === "urgent"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.status}</td>
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
