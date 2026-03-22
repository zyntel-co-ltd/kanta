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
  FlaskConical,
  Grid3X3,
  Package,
  Search,
  Trash2,
  Archive,
  Plus,
  Download,
  Filter,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings2,
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

type Tab = "overview" | "lj" | "westgard" | "qualitative" | "calculator" | "stats" | "samples";

const TABS: { id: Tab; label: string; icon: typeof ShieldCheck }[] = [
  { id: "overview",    label: "Overview",       icon: ShieldCheck    },
  { id: "lj",          label: "L-J Chart",      icon: BarChart3      },
  { id: "westgard",    label: "Westgard",        icon: AlertTriangle  },
  { id: "qualitative", label: "Qualitative QC",  icon: TestTube       },
  { id: "calculator",  label: "QC Calculator",   icon: Calculator     },
  { id: "stats",       label: "QC Stats",        icon: TrendingUp     },
  { id: "samples",     label: "Samples",         icon: FlaskConical   },
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

      {/* ── Tab bar — underline style ── */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto animate-slide-up stagger-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${
              activeTab === id
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
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
        {activeTab === "samples"     && <SamplesTab />}
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

/* ═══════════════════════════════════════════════════════════ */
/*  SAMPLE MANAGEMENT TAB  (Lab-hub integration)              */
/* ═══════════════════════════════════════════════════════════ */

const LAB_HUB_URL_KEY = "kanta-lab-hub-url";

type Rack = {
  id: number;
  rack_name: string;
  rack_date: string;
  rack_type: "normal" | "igra";
  description?: string;
  status: "empty" | "partial" | "full";
  total_samples: number;
};

type SampleResult = {
  id: number;
  barcode: string;
  patient_id?: string;
  sample_type?: string;
  position: number;
  collection_date?: string;
  notes?: string;
  rack_id: number;
  discarded_at?: string;
};

type LabHubStats = {
  total_racks: number;
  total_samples: number;
  pending_discarding: number;
  rack_status: { empty: number; partial: number; full: number };
};

type SampleSubTab = "dashboard" | "racks" | "search";

const SAMPLE_SUB_TABS: { id: SampleSubTab; label: string; icon: typeof Grid3X3 }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "racks",     label: "Racks",     icon: Grid3X3   },
  { id: "search",    label: "Search",    icon: Search    },
];

function rackStatusColor(status: string) {
  if (status === "full")    return "bg-emerald-100 text-emerald-700";
  if (status === "partial") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

function positionLabel(position: number) {
  const row = Math.floor(position / 10);
  const col = (position % 10) + 1;
  return `${String.fromCharCode(65 + row)}${col}`;
}

function SamplesTab() {
  const [labHubUrl, setLabHubUrl] = useState<string>(() => {
    try { return localStorage.getItem(LAB_HUB_URL_KEY) ?? "http://localhost:8000"; } catch { return "http://localhost:8000"; }
  });
  const [urlInput, setUrlInput] = useState(labHubUrl);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [subTab, setSubTab] = useState<SampleSubTab>("dashboard");

  const [stats, setStats] = useState<LabHubStats | null>(null);
  const [recentRacks, setRecentRacks] = useState<Rack[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [racksLoading, setRacksLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRack, setNewRack] = useState({ rack_name: "", rack_date: new Date().toISOString().slice(0, 10), rack_type: "normal", description: "" });
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [searchResults, setSearchResults] = useState<SampleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const apiFetch = (path: string, options?: RequestInit) =>
    fetch(`${labHubUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });

  const checkConnection = async (url = labHubUrl) => {
    setChecking(true);
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(4000) });
      const ok = res.ok;
      setConnected(ok);
      if (ok) { loadDashboard(url); loadRacks(url); }
      return ok;
    } catch {
      setConnected(false);
      return false;
    } finally { setChecking(false); }
  };

  const saveUrl = async () => {
    const trimmed = urlInput.replace(/\/$/, "");
    setLabHubUrl(trimmed);
    try { localStorage.setItem(LAB_HUB_URL_KEY, trimmed); } catch {}
    setShowSettings(false);
    await checkConnection(trimmed);
  };

  const loadDashboard = async (url = labHubUrl) => {
    try {
      const [statsRes, racksRes] = await Promise.all([
        fetch(`${url}/api/stats`),
        fetch(`${url}/api/racks/?limit=5`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (racksRes.ok) setRecentRacks(await racksRes.json());
    } catch {}
  };

  const loadRacks = async (url = labHubUrl) => {
    setRacksLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set("start_date", filters.startDate);
      if (filters.endDate)   params.set("end_date",   filters.endDate);
      if (filters.status)    params.set("status",     filters.status);
      const res = await fetch(`${url}/api/racks/?${params}`);
      if (res.ok) setRacks(await res.json());
    } catch {}
    finally { setRacksLoading(false); }
  };

  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiFetch("/api/racks/", {
        method: "POST",
        body: JSON.stringify({ ...newRack, rack_date: new Date(newRack.rack_date).toISOString() }),
      });
      if (!res.ok) throw new Error("failed");
      setShowCreateModal(false);
      setNewRack({ rack_name: "", rack_date: new Date().toISOString().slice(0, 10), rack_type: "normal", description: "" });
      loadRacks(); loadDashboard();
    } catch { alert("Failed to create rack."); }
    finally { setCreating(false); }
  };

  const handleDeleteRack = async (id: number, name: string) => {
    if (!confirm(`Delete rack "${name}" and all its samples?`)) return;
    try { await apiFetch(`/api/racks/${id}`, { method: "DELETE" }); loadRacks(); loadDashboard(); }
    catch { alert("Failed to delete rack."); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (filters.startDate) params.set("start_date", filters.startDate);
      if (filters.endDate)   params.set("end_date",   filters.endDate);
      if (filters.status)    params.set("status",     filters.status);
      const res = await fetch(`${labHubUrl}/api/export/?${params}`);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lab_samples_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert("Export failed — check Lab-hub connection."); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true); setSearched(true);
    try {
      const res = await apiFetch("/api/samples/search", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery.trim(), search_type: searchField }),
      });
      setSearchResults(res.ok ? await res.json() : []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { checkConnection(); }, []);

  return (
    <div className="space-y-5">

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1" style={{ fontSize: "1.0625rem", letterSpacing: "-0.02em" }}>Lab-hub Connection</h3>
            <p className="text-sm text-slate-500 mb-4">
              Enter the base URL of your Lab-hub server (e.g.{" "}
              <code className="bg-slate-100 px-1 rounded text-xs">http://192.168.1.10:8000</code>)
            </p>
            <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inputCls + " mb-4"} placeholder="http://localhost:8000" />
            <div className="flex gap-3">
              <button onClick={saveUrl} className={btnPrimary + " flex-1 justify-center"}>Save &amp; Connect</button>
              <button onClick={() => setShowSettings(false)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Connection banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
        connected === false ? "bg-red-50 border border-red-100 text-red-700"
        : connected === true ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
        : "bg-amber-50 border border-amber-100 text-amber-700"
      }`}>
        {checking
          ? <RefreshCw size={15} className="animate-spin" />
          : connected === false ? <WifiOff size={15} />
          : <Wifi size={15} />}
        <span className="flex-1">
          {checking ? "Checking Lab-hub connection…"
            : connected === false ? `Cannot reach Lab-hub at ${labHubUrl}`
            : connected === true ? `Connected · ${labHubUrl}`
            : "Connecting…"}
        </span>
        <button onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all">
          <Settings2 size={12} /> Configure
        </button>
        <button onClick={() => checkConnection()} disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw size={12} className={checking ? "animate-spin" : ""} /> Retry
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl w-fit">
        {SAMPLE_SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${
              subTab === id ? "bg-white text-emerald-700 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700"
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {subTab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { label: "Total Racks",     value: stats?.total_racks          ?? "—", icon: Grid3X3,  color: "bg-indigo-50 text-indigo-600"   },
              { label: "Total Samples",   value: stats?.total_samples        ?? "—", icon: Package,  color: "bg-emerald-50 text-emerald-600" },
              { label: "Partial Racks",   value: stats?.rack_status?.partial ?? "—", icon: BarChart3, color: "bg-amber-50 text-amber-600"   },
              { label: "Pending Discard", value: stats?.pending_discarding   ?? "—", icon: Trash2,   color: "bg-red-50 text-red-600"         },
            ] as { label: string; value: number | string; icon: typeof Grid3X3; color: string }[]).map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}><Icon size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="text-2xl font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHead icon={Grid3X3} title="Recent Racks" />
              <button onClick={() => setSubTab("racks")} className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">View all →</button>
            </div>
            {recentRacks.length === 0 ? (
              <div className="text-center py-10">
                <Grid3X3 size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-3">No racks yet.</p>
                <button onClick={() => { setSubTab("racks"); setShowCreateModal(true); }} className={btnPrimary + " mx-auto"}>
                  <Plus size={14} /> Create First Rack
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRacks.map((rack) => {
                  const cap = rack.rack_type === "igra" ? 40 : 100;
                  return (
                    <div key={rack.id} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-all">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{rack.rack_name}</p>
                        <p className="text-xs text-slate-400">{new Date(rack.rack_date).toLocaleDateString()} · {rack.rack_type === "igra" ? "IGRA" : "Normal"}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{rack.total_samples}/{cap} samples</p>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(rack.total_samples / cap) * 100}%` }} />
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rackStatusColor(rack.status)}`}>{rack.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Racks ── */}
      {subTab === "racks" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <SectionHead icon={Grid3X3} title="Sample Racks" />
            <div className="flex gap-2">
              <button onClick={handleExport} className={btnSecondary}><Download size={14} /> Export CSV</button>
              <button onClick={() => setShowCreateModal(true)} className={btnPrimary}><Plus size={14} /> New Rack</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={14} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Filters</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input type="date" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={selectCls}>
                  <option value="">All</option>
                  <option value="empty">Empty</option>
                  <option value="partial">Partial</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => loadRacks()} disabled={racksLoading} className={btnPrimary + " w-full justify-center"}>
                  {racksLoading ? <RefreshCw size={13} className="animate-spin" /> : <Filter size={13} />} Apply
                </button>
              </div>
            </div>
          </div>

          {racksLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
              <RefreshCw size={16} className="animate-spin" /> Loading racks…
            </div>
          ) : racks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
              <Grid3X3 size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">No racks found.</p>
              <button onClick={() => setShowCreateModal(true)} className={btnPrimary + " mx-auto"}>
                <Plus size={14} /> Create First Rack
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {racks.map((rack) => {
                const cap = rack.rack_type === "igra" ? 40 : 100;
                const pct = Math.round((rack.total_samples / cap) * 100);
                return (
                  <div key={rack.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm" style={{ letterSpacing: "-0.01em" }}>{rack.rack_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(rack.rack_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rackStatusColor(rack.status)}`}>{rack.status}</span>
                    </div>
                    {rack.description && <p className="text-xs text-slate-500">{rack.description}</p>}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>{rack.rack_type === "igra" ? "IGRA Rack" : "Normal Rack"}</span>
                        <span>{rack.total_samples}/{cap} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${rack.status === "full" ? "bg-emerald-500" : rack.status === "partial" ? "bg-amber-400" : "bg-slate-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <a href={`${labHubUrl}/rack/${rack.id}`} target="_blank" rel="noopener noreferrer"
                        className={btnPrimary + " flex-1 justify-center text-xs"}>
                        View in Lab-hub ↗
                      </a>
                      <button onClick={() => handleDeleteRack(rack.id, rack.rack_name)}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowCreateModal(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-slate-900" style={{ fontSize: "1.125rem", letterSpacing: "-0.02em" }}>Create New Rack</h3>
                <form onSubmit={handleCreateRack} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rack Name *</label>
                    <input type="text" value={newRack.rack_name} onChange={(e) => setNewRack((r) => ({ ...r, rack_name: e.target.value }))}
                      required placeholder="e.g. Morning Batch 001" className={inputCls} autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                    <input type="date" value={newRack.rack_date} onChange={(e) => setNewRack((r) => ({ ...r, rack_date: e.target.value }))}
                      required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rack Type *</label>
                    <select value={newRack.rack_type} onChange={(e) => setNewRack((r) => ({ ...r, rack_type: e.target.value }))} className={selectCls}>
                      <option value="normal">Normal Rack (100 positions — 10×10)</option>
                      <option value="igra">IGRA Rack (40 positions — 10×4)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                    <textarea value={newRack.description} onChange={(e) => setNewRack((r) => ({ ...r, description: e.target.value }))}
                      rows={2} placeholder="Optional…" className={inputCls + " resize-none"} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={creating} className={btnPrimary + " flex-1 justify-center"}>
                      {creating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Create Rack
                    </button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search ── */}
      {subTab === "search" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <SectionHead icon={Search} title="Search Samples" />
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by barcode, patient ID, sample type…"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={searching || !searchQuery.trim()} className={btnPrimary}>
                  {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search in:</span>
                {(["all", "barcode", "patient_id"] as const).map((val) => (
                  <label key={val} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600">
                    <input type="radio" value={val} checked={searchField === val} onChange={(e) => setSearchField(e.target.value)} className="accent-emerald-600" />
                    {val === "all" ? "All Fields" : val === "barcode" ? "Barcode" : "Patient ID"}
                  </label>
                ))}
              </div>
            </form>
          </div>

          {searched && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionHead icon={Package} title="Search Results" />
                <span className="text-xs font-semibold text-slate-400">
                  {searchResults.length} {searchResults.length === 1 ? "sample" : "samples"} found
                </span>
              </div>
              {searchResults.length === 0 ? (
                <div className="text-center py-10">
                  <Package size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No samples match your search.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-slate-400" />
                          <span className="font-semibold text-slate-800 text-sm">{s.barcode}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.discarded_at ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {s.discarded_at ? "Discarded" : "Active"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {s.patient_id  && <span>Patient: <strong className="text-slate-700">{s.patient_id}</strong></span>}
                          {s.sample_type && <span>Type: <strong className="text-slate-700">{s.sample_type}</strong></span>}
                          <span>Position: <strong className="text-slate-700">{positionLabel(s.position)}</strong></span>
                          {s.collection_date && (
                            <span>Collected: <strong className="text-slate-700">{new Date(s.collection_date).toLocaleDateString()}</strong></span>
                          )}
                        </div>
                        {s.notes && <p className="text-xs text-slate-400 italic">&ldquo;{s.notes}&rdquo;</p>}
                      </div>
                      <a href={`${labHubUrl}/rack/${s.rack_id}`} target="_blank" rel="noopener noreferrer"
                        className={btnSecondary + " text-xs whitespace-nowrap flex-shrink-0"}>
                        View Rack ↗
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
