"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const REFRESH_MS = 60000;

type LRIDSItem = {
  id: string;
  lab_number?: string;
  test_name: string;
  section: string;
  status: string;
  resulted_at?: string;
};

export default function LRIDSDisplayPage() {
  const params = useParams();
  const facilityId = (params.facility as string) ?? "00000000-0000-0000-0000-000000000001";
  const [data, setData] = useState<LRIDSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/tat/lrids?facility_id=${facilityId}&limit=100`
        );
        const json = await res.json();
        setData(json.data ?? []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const dataInterval = setInterval(fetchData, REFRESH_MS);
    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, [facilityId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Laboratory Report Information Display System
        </h1>
        <p className="text-2xl text-slate-400 mt-2">
          {currentTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {currentTime.toLocaleTimeString("en-US", { hour12: true })}
        </p>
      </header>

      <main>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="px-8 py-6 text-2xl font-semibold">Lab Number</th>
                <th className="px-8 py-6 text-2xl font-semibold">Test</th>
                <th className="px-8 py-6 text-2xl font-semibold">Section</th>
                <th className="px-8 py-6 text-2xl font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-2xl text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-2xl text-slate-400">
                    No results ready for collection
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30"
                  >
                    <td className="px-8 py-6 text-3xl font-mono font-bold">
                      {row.lab_number ?? "—"}
                    </td>
                    <td className="px-8 py-6 text-2xl">{row.test_name}</td>
                    <td className="px-8 py-6 text-2xl text-slate-300">{row.section}</td>
                    <td className="px-8 py-6">
                      <span
                        className={`inline-flex px-4 py-2 rounded-xl text-xl font-semibold ${
                          row.status === "resulted"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {row.status === "resulted" ? "Ready" : "In progress"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <p className="mt-6 text-sm text-slate-500 text-center">
        Auto-refresh every 60 seconds
      </p>
    </div>
  );
}
