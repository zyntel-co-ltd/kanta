"use client";

import { useEffect, useState, useCallback } from "react";
import LeveyJenningsChart from "@/components/qc/LeveyJenningsChart";
import type { LJPoint } from "@/components/qc/LeveyJenningsChart";
import {
  ShieldCheck,
  AlertTriangle,
  Upload,
  BarChart3,
  TestTube,
  Calculator,
  TrendingUp,
  Beaker,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Copy,
  Check,
} from "lucide-react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

/* ─── Types ─── */
type Material = {
  id: string;
  name: string;
  analyte: string;
  last_value: number | null;
  last_run_at: string | null;
  pass: boolean | null;
};
type Violation = {
  id: string;
  rule: string;
  detected_at: string;
  run?: { value: number; material_id: string };
};
type QualConfig = {
  id: string;
  test_name: string;
  result_type: string;
  controls: Array<{ name: string; expectedResult: string }>;
};
type QualEntry = {
  id: string;
  run_at: string;
  overall_pass: boolean;
  control_results: Array<{ controlName: string; expectedResult: string; observedResult: string }>;
  qualitative_qc_configs?: { test_name: string };
};
type QCRun = {
  id: string;
  material_id: string;
  value: number;
  run_at: string;
  pass: boolean;
};

type Tab = "overview" | "lj" | "westgard" | "qualitative" | "calculator" | "stats";

const TABS: { id: Tab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "overview",    label: "Overview",       icon: ShieldCheck    },
  { id: "lj",          label: "L-J Chart",      icon: BarChart3      },
  { id: "westgard",    label: "Westgard",        icon: AlertTriangle  },
  { id: "qualitative", label: "Qualitative QC",  icon: TestTube       },
  { id: "calculator",  label: "QC Calculator",   icon: Calculator     },
  { id: "stats",       label: "QC Stats",        icon: TrendingUp     },
];

/* ─── Stat card ─── */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Section heading ─── */
function SectionHead({ icon: Icon, title }: { icon: typeof ShieldCheck; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
        <Icon size={14} className="text-emerald-600" />
      </div>
      <h3 className="font-semibold text-slate-800" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
        {title}
      </h3>
    </div>
  );
}

/* ─── Input / Select helpers ─── */
const inputCls = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-sm";
const selectCls = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all text-sm";
const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-50";
const btnSecondary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all";

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                  */
/* ═══════════════════════════════════════════════════════════ */
export default function QCPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [qualConfigs, setQualConfigs] = useState<QualConfig[]>([]);
  const [qualEntries, setQualEntries] = useState<QualEntry[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ points: LJPoint[]; mean: number; sd: number } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [mRes, vRes, qcRes, qeRes] = await Promise.all([
        fetch(`/api/qc/materials?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/qc/violations?facility_id=${DEFAULT_FACILITY_ID}&limit=50`),
        fetch(`/api/qc/qualitative/configs?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/qc/qualitative/entries?facility_id=${DEFAULT_FACILITY_ID}&limit=50`),
      ]);
      const [mData, vData, qcData, qeData] = await Promise.all([mRes.json(), vRes.json(), qcRes.json(), qeRes.json()]);
      setMaterials(mData.data ?? []);
      setViolations(vData.data ?? []);
      setQualConfigs(qcData.data ?? []);
      setQualEntries(qeData.data ?? []);
    } catch {
      setMaterials([]); setViolations([]); setQualConfigs([]); setQualEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedMaterial) { setChartData(null); return; }
    fetch(`/api/qc/runs?material_id=${selectedMaterial}&limit=50`)
      .then((r) => r.json())
      .then((j) => setChartData(j.data ?? null))
      .catch(() => setChartData(null));
  }, [selectedMaterial]);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const res = await fetch("/api/qc/import", { method: "POST", headers: { "x-facility-id": DEFAULT_FACILITY_ID }, body: form });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchData();
      setImportFile(null);
    } catch (e) { alert((e as Error).message); }
    finally { setImporting(false); }
  };

  const passing = materials.filter((m) => m.pass === true).length;
  const failing = materials.filter((m) => m.pass === false).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading QC data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between animate-slide-up">
        <div>
          <p className="text-eyebrow mb-1">Quality Management</p>
          <h1 className="text-slate-900" style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
            Quality Control
          </h1>
          <p className="text-slate-500 mt-0.5" style={{ fontSize: "0.875rem" }}>
            Quantitative L-J, Westgard rules, qualitative QC, calculator and statistics.
          </p>
        </div>
        {/* Import CSV (visible when on overview or lj) */}
        {(activeTab === "overview" || activeTab === "lj") && (
          <div className="flex items-center gap-2">
            <label className={btnSecondary + " cursor-pointer"}>
              <Upload size={14} /> Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            </label>
            {importFile && (
              <button onClick={handleImport} disabled={importing} className={btnPrimary}>
                {importing ? "Uploading…" : "Upload"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up stagger-1">
        <StatCard label="Materials" value={materials.length} sub="Active analytes" />
        <StatCard label="Passing" value={passing} sub="Latest run pass" />
        <StatCard label="Failing" value={failing} sub="Needs attention" />
        <StatCard label="Violations" value={violations.length} sub="Westgard flags" />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl w-fit animate-slide-up stagger-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${
              activeTab === id
                ? "bg-white text-emerald-700 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="animate-fade-in">
        {activeTab === "overview"    && <OverviewTab materials={materials} violations={violations} selectedMaterial={selectedMaterial} setSelectedMaterial={setSelectedMaterial} />}
        {activeTab === "lj"          && <LJTab materials={materials} chartData={chartData} selectedMaterial={selectedMaterial} setSelectedMaterial={setSelectedMaterial} />}
        {activeTab === "westgard"    && <WestgardTab violations={violations} />}
        {activeTab === "qualitative" && <QualitativeTab configs={qualConfigs} entries={qualEntries} facilityId={DEFAULT_FACILITY_ID} onRefresh={fetchData} />}
        {activeTab === "calculator"  && <CalculatorTab />}
        {activeTab === "stats"       && <StatsTab materials={materials} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  OVERVIEW TAB                                               */
/* ═══════════════════════════════════════════════════════════ */
function OverviewTab({ materials, violations, selectedMaterial, setSelectedMaterial }: {
  materials: Material[];
  violations: Violation[];
  selectedMaterial: string | null;
  setSelectedMaterial: (id: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={Beaker} title="Active Materials" />
        {materials.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No materials. Import from Lab-hub CSV.</p>
        ) : (
          <div className="space-y-1.5">
            {materials.map((m) => (
              <button key={m.id} onClick={() => setSelectedMaterial(selectedMaterial === m.id ? null : m.id)}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm ${selectedMaterial === m.id ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`}
              >
                <div>
                  <p className="font-medium text-slate-800">{m.name}</p>
                  {m.analyte && <p className="text-xs text-slate-400">{m.analyte}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.pass === true ? "bg-emerald-100 text-emerald-700" : m.pass === false ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                  {m.pass === true ? "Pass" : m.pass === false ? "Fail" : "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={AlertTriangle} title="Recent Violations" />
        {violations.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No Westgard violations.</p>
        ) : (
          <div className="space-y-2">
            {violations.slice(0, 8).map((v) => (
              <div key={v.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={12} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700">{v.rule}</p>
                  <p className="text-xs text-slate-400">{new Date(v.detected_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  L-J CHART TAB                                              */
/* ═══════════════════════════════════════════════════════════ */
function LJTab({ materials, chartData, selectedMaterial, setSelectedMaterial }: {
  materials: Material[];
  chartData: { points: LJPoint[]; mean: number; sd: number } | null;
  selectedMaterial: string | null;
  setSelectedMaterial: (id: string | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={Beaker} title="Select material to plot" />
        <div className="flex flex-wrap gap-2">
          {materials.length === 0
            ? <p className="text-sm text-slate-400">No materials. Import a Lab-hub CSV first.</p>
            : materials.map((m) => (
              <button key={m.id} onClick={() => setSelectedMaterial(selectedMaterial === m.id ? null : m.id)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all ${selectedMaterial === m.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
              >
                {m.name}
              </button>
            ))}
        </div>
      </div>
      {selectedMaterial && chartData ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHead icon={BarChart3} title="Levey-Jennings Chart" />
          <div className="overflow-x-auto">
            <LeveyJenningsChart data={chartData.points} mean={chartData.mean} sd={chartData.sd} width={720} height={340} />
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span>Mean: <strong className="text-slate-700">{chartData.mean.toFixed(3)}</strong></span>
            <span>SD: <strong className="text-slate-700">{chartData.sd.toFixed(3)}</strong></span>
            <span>±1SD: <strong className="text-slate-700">{(chartData.mean - chartData.sd).toFixed(3)} – {(chartData.mean + chartData.sd).toFixed(3)}</strong></span>
            <span>±2SD: <strong className="text-slate-700">{(chartData.mean - 2 * chartData.sd).toFixed(3)} – {(chartData.mean + 2 * chartData.sd).toFixed(3)}</strong></span>
          </div>
        </div>
      ) : selectedMaterial ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">No run data for this material yet.</div>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  WESTGARD TAB                                               */
/* ═══════════════════════════════════════════════════════════ */
function WestgardTab({ violations }: { violations: Violation[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <SectionHead icon={AlertTriangle} title="Westgard Violations Log" />
      {violations.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No Westgard violations detected.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rule</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Value</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {violations.map((v) => (
                <tr key={v.id} className="hover:bg-red-50/40 transition-colors">
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      <AlertTriangle size={10} /> {v.rule}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">{v.run?.value ?? "—"}</td>
                  <td className="py-3 px-3 text-slate-500">{new Date(v.detected_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC TAB (ported from existing Kanta code)       */
/* ═══════════════════════════════════════════════════════════ */
function QualitativeTab({ configs, entries, facilityId, onRefresh }: {
  configs: QualConfig[];
  entries: QualEntry[];
  facilityId: string;
  onRefresh: () => void;
}) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configForm, setConfigForm] = useState({ test_name: "", result_type: "Positive / Negative", controls: [{ name: "", expectedResult: "" }] });
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [entryForm, setEntryForm] = useState({ run_at: new Date().toISOString().slice(0, 10), control_results: [] as Array<{ controlName: string; expectedResult: string; observedResult: string }>, corrective_action: "" });
  const [saving, setSaving] = useState(false);

  const selectedConfig = configs.find((c) => c.id === selectedConfigId);
  const resultOptions = selectedConfig?.result_type?.split(" / ").map((s) => s.trim()) ?? ["Positive", "Negative"];

  useEffect(() => {
    if (!selectedConfigId || !selectedConfig) { setEntryForm((p) => ({ ...p, control_results: [] })); return; }
    setEntryForm((p) => ({ ...p, control_results: (selectedConfig.controls ?? []).map((c) => ({ controlName: c.name, expectedResult: c.expectedResult, observedResult: "" })) }));
  }, [selectedConfigId, selectedConfig]);

  const handleSaveConfig = async () => {
    if (!configForm.test_name.trim()) return;
    const controls = configForm.controls.filter((c) => c.name.trim() && c.expectedResult);
    if (controls.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/qc/qualitative/configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facility_id: facilityId, test_name: configForm.test_name.trim(), result_type: configForm.result_type, controls }) });
      setShowConfigForm(false);
      setConfigForm({ test_name: "", result_type: "Positive / Negative", controls: [{ name: "", expectedResult: "" }] });
      onRefresh();
    } catch { alert("Failed to save config"); }
    finally { setSaving(false); }
  };

  const handleSaveEntry = async () => {
    if (!selectedConfigId || !entryForm.run_at) return;
    if (!entryForm.control_results.every((r) => r.observedResult)) return;
    const overallPass = entryForm.control_results.every((r) => r.observedResult === r.expectedResult);
    setSaving(true);
    try {
      await fetch("/api/qc/qualitative/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facility_id: facilityId, config_id: selectedConfigId, run_at: entryForm.run_at, control_results: entryForm.control_results, overall_pass: overallPass, corrective_action: entryForm.corrective_action || null, submitted: true }) });
      setSelectedConfigId("");
      setEntryForm({ run_at: new Date().toISOString().slice(0, 10), control_results: [], corrective_action: "" });
      onRefresh();
    } catch { alert("Failed to save entry"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Configs panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHead icon={TestTube} title="Test Configurations" />
            <button onClick={() => setShowConfigForm(!showConfigForm)} className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
              {showConfigForm ? "Cancel" : "+ Add Config"}
            </button>
          </div>
          {showConfigForm && (
            <div className="space-y-3 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" placeholder="Test name (e.g. HIV Rapid)" value={configForm.test_name} onChange={(e) => setConfigForm((p) => ({ ...p, test_name: e.target.value }))} className={inputCls} />
              <select value={configForm.result_type} onChange={(e) => setConfigForm((p) => ({ ...p, result_type: e.target.value }))} className={selectCls}>
                <option>Positive / Negative</option>
                <option>Reactive / Non-Reactive</option>
                <option>Detected / Not Detected</option>
                <option>Pass / Fail</option>
              </select>
              {configForm.controls.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="Control name" value={c.name} onChange={(e) => setConfigForm((p) => ({ ...p, controls: p.controls.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <select value={c.expectedResult} onChange={(e) => setConfigForm((p) => ({ ...p, controls: p.controls.map((x, j) => j === i ? { ...x, expectedResult: e.target.value } : x) }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
                    {resultOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={() => { const opts = configForm.result_type.split(" / ").map((s) => s.trim()); setConfigForm((p) => ({ ...p, controls: [...p.controls, { name: "", expectedResult: opts[0] ?? "" }] })); }} className="text-xs text-emerald-600 font-medium">+ Add control</button>
              </div>
              <button onClick={handleSaveConfig} disabled={saving} className={btnPrimary + " w-full justify-center"}>Save Config</button>
            </div>
          )}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {configs.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">No qualitative configs yet.</p>
              : configs.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm">
                  <span className="font-medium text-slate-800">{c.test_name}</span>
                  <span className="text-xs text-slate-400">{(c.controls ?? []).length} controls</span>
                </div>
              ))}
          </div>
        </div>

        {/* Record entry */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHead icon={ClipboardList} title="Record Entry" />
          <div className="space-y-3">
            <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className={selectCls}>
              <option value="">Select test…</option>
              {configs.map((c) => <option key={c.id} value={c.id}>{c.test_name}</option>)}
            </select>
            <input type="date" value={entryForm.run_at} onChange={(e) => setEntryForm((p) => ({ ...p, run_at: e.target.value }))} className={inputCls} />
            {entryForm.control_results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-slate-600 w-28 truncate font-medium">{r.controlName}</span>
                <span className="text-xs text-slate-400 w-16">→ {r.expectedResult}</span>
                <select value={r.observedResult} onChange={(e) => setEntryForm((p) => ({ ...p, control_results: p.control_results.map((x, j) => j === i ? { ...x, observedResult: e.target.value } : x) }))} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  <option value="">—</option>
                  {resultOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <input type="text" placeholder="Corrective action (if result fails)" value={entryForm.corrective_action} onChange={(e) => setEntryForm((p) => ({ ...p, corrective_action: e.target.value }))} className={inputCls} />
            <button onClick={handleSaveEntry} disabled={saving || !selectedConfigId || !entryForm.control_results.every((r) => r.observedResult)} className={btnPrimary + " w-full justify-center"}>
              Save Entry
            </button>
          </div>
        </div>
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={ClipboardList} title="Recent Entries" />
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {entries.length === 0
            ? <p className="text-sm text-slate-400 text-center py-6">No qualitative entries yet.</p>
            : entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm">
                <span className="text-slate-700">{(e.qualitative_qc_configs as { test_name?: string })?.test_name ?? "—"} <span className="text-slate-400">· {e.run_at}</span></span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${e.overall_pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {e.overall_pass ? "Pass" : "Fail"}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC CALCULATOR TAB  (ported from Lab-hub QCCalculator.js)  */
/* ═══════════════════════════════════════════════════════════ */
function CalculatorTab() {
  const [inputs, setInputs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-inputs") ?? "null") || Array(25).fill(""); } catch { return Array(25).fill(""); }
  });
  const [mean, setMean] = useState<number | null>(null);
  const [sd, setSD] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { localStorage.setItem("kanta-qc-calc-inputs", JSON.stringify(inputs)); } catch {} }, [inputs]);

  const handleChange = (idx: number, val: string) => {
    const next = [...inputs]; next[idx] = val.replace(/[^0-9.-]/g, ""); setInputs(next);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setCopied(false);
    const values = inputs.map(Number);
    if (values.some(isNaN)) { setError("Please enter a valid number in every field."); setMean(null); setSD(null); return; }
    const m = values.reduce((a, v) => a + v, 0) / values.length;
    const s = Math.sqrt(values.reduce((a, v) => a + Math.pow(v - m, 2), 0) / values.length);
    setMean(m); setSD(s);
  };

  const handleReset = () => { setInputs(Array(25).fill("")); setMean(null); setSD(null); setError(""); setCopied(false); try { localStorage.removeItem("kanta-qc-calc-inputs"); } catch {} };

  const handleCopy = () => {
    if (mean != null && sd != null) {
      navigator.clipboard.writeText(`Mean: ${mean.toFixed(4)}\nSD: ${sd.toFixed(4)}`);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <SectionHead icon={Calculator} title="QC Mean & SD Calculator" />
        <p className="text-sm text-slate-500 mb-5">Enter up to 25 QC run values to calculate the Mean and Standard Deviation for a new control lot.</p>
        <form onSubmit={handleCalculate} className="space-y-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {inputs.map((val, idx) => (
              <div key={idx}>
                <input
                  type="number" step="any" value={val} onChange={(e) => handleChange(idx, e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                  placeholder={`${idx + 1}`} required
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={btnPrimary}>
              <Calculator size={14} /> Calculate
            </button>
            <button type="button" onClick={handleReset} className={btnSecondary}>Reset</button>
            <button type="button" onClick={handleCopy} disabled={mean == null} className={btnSecondary + " disabled:opacity-40"}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Results</>}
            </button>
          </div>
        </form>
      </div>

      {mean != null && sd != null && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
          <h3 className="font-semibold text-emerald-800 mb-4" style={{ fontSize: "0.9375rem" }}>Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">Mean</p>
              <p className="text-2xl font-bold text-emerald-700" style={{ letterSpacing: "-0.03em" }}>{mean.toFixed(4)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">Std Deviation</p>
              <p className="text-2xl font-bold text-emerald-700" style={{ letterSpacing: "-0.03em" }}>{sd.toFixed(4)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-emerald-700">
            <p>±1 SD: <strong>{(mean - sd).toFixed(3)}</strong> – <strong>{(mean + sd).toFixed(3)}</strong></p>
            <p>±2 SD: <strong>{(mean - 2 * sd).toFixed(3)}</strong> – <strong>{(mean + 2 * sd).toFixed(3)}</strong></p>
            <p>±3 SD: <strong>{(mean - 3 * sd).toFixed(3)}</strong> – <strong>{(mean + 3 * sd).toFixed(3)}</strong></p>
            <p>CV%: <strong>{((sd / mean) * 100).toFixed(2)}%</strong></p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC STATS TAB  (ported from Lab-hub QCStats.js)            */
/* ═══════════════════════════════════════════════════════════ */
function StatsTab({ materials }: { materials: Material[] }) {
  const [runs, setRuns] = useState<QCRun[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingRuns, setLoadingRuns] = useState(false);

  useEffect(() => {
    if (!selectedMaterialId) { setRuns([]); return; }
    setLoadingRuns(true);
    fetch(`/api/qc/runs?material_id=${selectedMaterialId}&limit=200`)
      .then((r) => r.json())
      .then((j) => setRuns(j.data?.points ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoadingRuns(false));
  }, [selectedMaterialId]);

  const filtered = runs.filter((r) => {
    const d = r.run_at?.slice(0, 10) ?? "";
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const values = filtered.map((r) => r.value).filter((v) => !isNaN(v));
  const stats = values.length > 0 ? {
    count: values.length,
    mean: (values.reduce((a, v) => a + v, 0) / values.length).toFixed(3),
    sd: Math.sqrt(values.reduce((a, v) => a + Math.pow(v - values.reduce((a2, v2) => a2 + v2, 0) / values.length, 2), 0) / values.length).toFixed(3),
    min: Math.min(...values).toFixed(3),
    max: Math.max(...values).toFixed(3),
  } : null;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={TrendingUp} title="Filter Options" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Material</label>
            <select value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)} className={selectCls}>
              <option value="">Select material…</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} {m.analyte ? `· ${m.analyte}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Statistics summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Values" value={stats.count} />
          <StatCard label="Mean" value={stats.mean} />
          <StatCard label="Std Deviation" value={stats.sd} />
          <StatCard label="Minimum" value={stats.min} />
          <StatCard label="Maximum" value={stats.max} />
        </div>
      )}

      {/* Data table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={ClipboardList} title="QC Run Values" />
        {loadingRuns ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {selectedMaterialId ? "No runs found for the selected date range." : "Select a material above to view run data."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Date", "Value", "Status"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.slice().reverse().map((r, idx) => (
                  <tr key={r.id ?? idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-600">{r.run_at?.slice(0, 10) ?? "—"}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">{r.value}</td>
                    <td className="py-3 px-3">
                      {r.pass
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold"><CheckCircle2 size={10} /> Pass</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><XCircle size={10} /> Fail</span>}
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
