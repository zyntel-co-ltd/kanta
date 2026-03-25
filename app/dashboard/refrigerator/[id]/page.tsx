"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Thermometer } from "lucide-react";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";

type Reading = { temp: number; at: string };

export default function RefrigeratorUnitPage() {
  const params = useParams();
  const unitId = params.id as string;
  const [unit, setUnit] = useState<{ name: string; min_temp_celsius: number; max_temp_celsius: number } | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          fetch(`/api/refrigerator/units?facility_id=${DEFAULT_FACILITY_ID}`),
          fetch(`/api/refrigerator/readings?unit_id=${unitId}&range=${range}`),
        ]);
        const uData = await uRes.json();
        const rData = await rRes.json();
        const units = uData.data ?? [];
        const found = units.find((u: { id: string }) => u.id === unitId);
        setUnit(found ?? null);
        setReadings(rData.data ?? []);
      } catch {
        setUnit(null);
        setReadings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [unitId, range]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/refrigerator"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft size={14} /> Back to units
        </Link>
        <div className="bg-red-50 rounded-2xl p-6 text-red-700">Unit not found</div>
      </div>
    );
  }

  const minT = Number(unit.min_temp_celsius);
  const maxT = Number(unit.max_temp_celsius);
  const maxVal = Math.max(maxT + 2, ...readings.map((r) => r.temp));
  const minVal = Math.min(minT - 2, ...readings.map((r) => r.temp), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/refrigerator"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{unit.name}</h1>
            <p className="text-sm text-slate-500">
              Range: {minT}°C – {maxT}°C
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                range === r
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === "24h" ? "24 hours" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Thermometer size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800">Temperature Timeline</span>
        </div>
        <div className="p-6">
          {readings.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No readings in this range</p>
          ) : (
            <div className="h-64 flex items-end gap-0.5">
              {readings.map((r, i) => {
                const pct =
                  ((r.temp - minVal) / (maxVal - minVal || 1)) * 100;
                const inRange = r.temp >= minT && r.temp <= maxT;
                const warn = (r.temp >= minT - 1 && r.temp < minT) || (r.temp > maxT && r.temp <= maxT + 1);
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[2px] group relative"
                    title={`${r.temp}°C at ${new Date(r.at).toLocaleString()}`}
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        inRange
                          ? "bg-emerald-500"
                          : warn
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ height: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>Min: {minT}°C</span>
            <span>Max: {maxT}°C</span>
          </div>
        </div>
      </div>
    </div>
  );
}
