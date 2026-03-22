"use client";

import "@/components/charts/registry";
import { useEffect, useState, useCallback } from "react";
import { Line } from "react-chartjs-2";
import type { ChartOptions, ChartData } from "chart.js";
import {
  Plus, Save, CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, FlaskConical, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ───── Types ───── */
type Material = { id: string; name: string; analyte: string; level: string };

type QCRun = {
  id: string;
  run_date: string;
  value: number;
  z_score: number | null;
  rule_violations: string[];
  notes: string | null;
  operator: string | null;
};

type RunStats = {
  mean: number;
  sd: number;
  cv: number;
  count: number;
  min: number;
  max: number;
};

/* ───── Helpers ───── */
function calcStats(values: number[]): RunStats {
  if (values.length === 0) return { mean: 0, sd: 0, cv: 0, count: 0, min: 0, max: 0 };
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const sd = Math.sqrt(variance);
  return {
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(sd * 100) / 100,
    cv: mean !== 0 ? Math.round((sd / mean) * 10000) / 100 : 0,
    count: n,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function westgardViolations(value: number, mean: number, sd: number, recent: number[]): string[] {
  if (sd === 0) return [];
  const z = (value - mean) / sd;
  const violations: string[] = [];
  if (Math.abs(z) > 3) violations.push("1-3S");
  if (Math.abs(z) > 2) violations.push("1-2S");
  const last2 = recent.slice(-2);
  if (last2.length === 2 && last2.every((v) => (v - mean) / sd > 2)) violations.push("2-2S");
  if (last2.length === 2 && last2.every((v) => (v - mean) / sd < -2)) violations.push("2-2S");
  const last4 = recent.slice(-4);
  if (last4.length === 4 && last4.every((v) => (v - mean) / sd > 1)) violations.push("4-1S");
  if (last4.length === 4 && last4.every((v) => (v - mean) / sd < -1)) violations.push("4-1S");
  const last10 = recent.slice(-10);
  if (last10.length === 10 && last10.every((v) => v > mean)) violations.push("10-X");
  if (last10.length === 10 && last10.every((v) => v < mean)) violations.push("10-X");
  return [...new Set(violations)];
}

function StatusBadge({ violations }: { violations: string[] }) {
  if (violations.length === 0)
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Pass</span>;
  if (violations.includes("1-3S") || violations.includes("2-2S"))
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={11} /> Reject ({violations.join(", ")})</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle size={11} /> Warning ({violations.join(", ")})</span>;
}

/* ───── Chart ───── */
function QCLineChart({ runs, stats }: { runs: QCRun[]; stats: RunStats }) {
  const labels = runs.map((r) => new Date(r.run_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
  const values = runs.map((r) => r.value);
  const { mean, sd } = stats;

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "QC Value",
        data: values,
        borderColor: "#059669",
        backgroundColor: "rgba(5,150,105,0.08)",
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.2,
        fill: false,
        borderWidth: 2,
        pointBackgroundColor: runs.map((r) =>
          r.rule_violations.includes("1-3S") || r.rule_violations.includes("2-2S")
            ? "#ef4444"
            : r.rule_violations.length > 0
            ? "#f59e0b"
            : "#059669"
        ),
      },
      { label: "Mean",   data: Array(values.length).fill(mean), borderColor: "#64748b",   borderDash: [4, 4], pointRadius: 0, borderWidth: 1.5 },
      { label: "+1 SD",  data: Array(values.length).fill(mean + sd), borderColor: "#93c5fd", borderDash: [2, 4], pointRadius: 0, borderWidth: 1 },
      { label: "-1 SD",  data: Array(values.length).fill(mean - sd), borderColor: "#93c5fd", borderDash: [2, 4], pointRadius: 0, borderWidth: 1 },
      { label: "+2 SD",  data: Array(values.length).fill(mean + 2 * sd), borderColor: "#fbbf24", borderDash: [2, 4], pointRadius: 0, borderWidth: 1 },
      { label: "-2 SD",  data: Array(values.length).fill(mean - 2 * sd), borderColor: "#fbbf24", borderDash: [2, 4], pointRadius: 0, borderWidth: 1 },
      { label: "+3 SD",  data: Array(values.length).fill(mean + 3 * sd), borderColor: "#f87171", borderDash: [2, 4], pointRadius: 0, borderWidth: 1 },
      { label: "-3 SD",  data: Array(values.length).fill(mean - 3 * sd), borderColor: "#f87171", borderDash: [2, 4], pointRadius: 0, borderWidth: 1 },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 10 }, padding: 10, boxWidth: 10 } },
      datalabels: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (ctx) => {
            const run = runs[ctx.dataIndex];
            if (ctx.datasetIndex !== 0 || !run) return "";
            const z = run.z_score ? `z=${run.z_score.toFixed(2)}` : "";
            const v = run.rule_violations.length > 0 ? run.rule_violations.join(", ") : "";
            return [z, v].filter(Boolean).join(" | ");
          },
        },
      },
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } } },
    },
  };

  return <Line data={data} options={options} />;
}

/* ───── Main component ───── */
export default function QuantitativeQCTab({
  facilityId,
  materials,
}: {
  facilityId: string;
  materials: Material[];
}) {
  const supabase = createClient();

  const [selectedMaterial, setSelectedMaterial] = useState<string>(materials[0]?.id ?? "");
  const [runs, setRuns]   = useState<QCRun[]>([]);
  const [stats, setStats] = useState<RunStats>({ mean: 0, sd: 0, cv: 0, count: 0, min: 0, max: 0 });
  const [loading, setLoading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  /* Form state */
  const [form, setForm] = useState({
    run_date: new Date().toISOString().slice(0, 10),
    value: "",
    notes: "",
    operator: "",
  });

  const loadRuns = useCallback(async () => {
    if (!selectedMaterial) return;
    setLoading(true);
    const { data } = await supabase
      .from("qc_results")
      .select("id, run_date, value, z_score, rule_violations, notes, operator")
      .eq("material_id", selectedMaterial)
      .eq("facility_id", facilityId)
      .order("run_date", { ascending: true })
      .limit(60);
    const rows: QCRun[] = (data ?? []).map((r) => ({
      id: r.id,
      run_date: r.run_date,
      value: parseFloat(r.value),
      z_score: r.z_score ? parseFloat(r.z_score) : null,
      rule_violations: Array.isArray(r.rule_violations) ? r.rule_violations : [],
      notes: r.notes,
      operator: r.operator,
    }));
    setRuns(rows);
    setStats(calcStats(rows.map((r) => r.value)));
    setLoading(false);
  }, [selectedMaterial, facilityId, supabase]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(form.value);
    if (isNaN(val)) return;

    setSubmitting(true);
    const recentVals = runs.map((r) => r.value);
    const violations = stats.count >= 5 ? westgardViolations(val, stats.mean, stats.sd, recentVals) : [];
    const zScore = stats.sd > 0 ? (val - stats.mean) / stats.sd : null;

    const { error } = await supabase.from("qc_results").insert({
      material_id: selectedMaterial,
      facility_id: facilityId,
      run_date: form.run_date,
      value: val,
      z_score: zScore,
      rule_violations: violations,
      result_type: "quantitative",
      notes: form.notes || null,
      operator: form.operator || null,
    });

    if (!error) {
      setForm({ run_date: new Date().toISOString().slice(0, 10), value: "", notes: "", operator: "" });
      setShowForm(false);
      await loadRuns();
    }
    setSubmitting(false);
  };

  const material = materials.find((m) => m.id === selectedMaterial);

  return (
    <div className="space-y-6 p-1">
      {/* Selector + Add button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} — {m.analyte} ({m.level})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus size={14} />
          Add Run
        </button>
      </div>

      {/* Entry form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-4">
          <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
            <FlaskConical size={14} />
            New QC Run — {material?.name} ({material?.analyte}, {material?.level})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={form.run_date}
                onChange={(e) => setForm({ ...form, run_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Value {stats.count >= 5 && <span className="text-slate-400">(mean: {stats.mean}, ±SD: {stats.sd})</span>}
              </label>
              <input
                type="number"
                step="any"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="Enter result value"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
              {/* Preview z-score inline */}
              {form.value && stats.sd > 0 && (
                <p className="text-xs mt-1 text-slate-500">
                  z = {((parseFloat(form.value) - stats.mean) / stats.sd).toFixed(2)}
                  {Math.abs((parseFloat(form.value) - stats.mean) / stats.sd) > 3 && (
                    <span className="ml-1 text-red-600 font-medium">— will trigger 1-3S</span>
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
              <input
                type="text"
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                placeholder="Name or initials"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
              Save Run
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stats row */}
      {stats.count > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Mean",  value: stats.mean },
            { label: "SD",    value: stats.sd   },
            { label: "CV%",   value: `${stats.cv}%` },
            { label: "Runs",  value: stats.count },
            { label: "Min",   value: stats.min  },
            { label: "Max",   value: stats.max  },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-base font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">
            Levey-Jennings — {material?.name} {material?.analyte} ({material?.level})
          </span>
          <span className="ml-auto text-xs text-slate-400">{runs.length} runs · ±1/2/3 SD reference lines</span>
        </div>
        <div className="p-4" style={{ height: 340 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : runs.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FlaskConical size={40} className="opacity-40 mb-2" />
              <p className="text-sm">Add at least 2 runs to see the chart</p>
            </div>
          ) : (
            <QCLineChart runs={runs} stats={stats} />
          )}
        </div>
      </div>

      {/* Run log table */}
      {runs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-800">Run Log</p>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-100">
                <tr>
                  {["Date", "Value", "Z-score", "Status", "Operator", "Notes"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...runs].reverse().map((r) => (
                  <tr key={r.id} className={`border-b border-slate-50 ${r.rule_violations.includes("1-3S") || r.rule_violations.includes("2-2S") ? "bg-red-50" : r.rule_violations.length > 0 ? "bg-amber-50" : ""}`}>
                    <td className="px-4 py-2 text-slate-600">{new Date(r.run_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-semibold text-slate-800">{r.value}</td>
                    <td className="px-4 py-2 text-slate-500">{r.z_score != null ? r.z_score.toFixed(2) : "—"}</td>
                    <td className="px-4 py-2"><StatusBadge violations={r.rule_violations} /></td>
                    <td className="px-4 py-2 text-slate-500">{r.operator ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400 max-w-xs truncate">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
