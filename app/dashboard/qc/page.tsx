"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react";
import {
  ShieldCheck, BarChart3, TestTube, Calculator,
  TrendingUp, ClipboardList,
  Download, Copy, Check, Plus, FlaskConical, Activity,
  ChevronDown, ChevronUp, X as XIcon,
} from "lucide-react";
import { LazyLine } from "@/components/charts/LazyCharts";
import type { ChartData, ChartOptions } from "chart.js";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { useAuth } from "@/lib/AuthContext";
import { facilityBrandingLine } from "@/lib/hospitalDisplayName";
import StatusBadge from "@/components/ui/StatusBadge";
import { STATUS, STRUCTURE } from "@/lib/design-tokens";
import { CHART_AXIS } from "@/lib/chart-theme";
import { LoadingBars } from "@/components/ui/PageLoader";
import { queuedFetch } from "@/lib/sync-queue/queuedFetch";

/* ─────────────────── Theme constants ─────────────────── */
const inputCls =
  "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]/30 " +
  "focus:border-[var(--module-primary)] transition-all text-sm";
const selectCls =
  "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--module-primary)]/30 focus:border-[var(--module-primary)] transition-all text-sm";
const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--module-primary)] hover:opacity-90 " +
  "text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const btnSecondary =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 " +
  "text-slate-700 text-sm font-semibold transition-all";
const tblHead = "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider";
const tblCell = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";

/* ─────────────────── Facility constant ─────────────────── */
const FACILITY_ID = DEFAULT_FACILITY_ID;

/* ─────────────────── Date / CSV helpers ─────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString(); } catch { return d ?? "—"; } };
const fmtShort = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; }
};

function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ─────────────────── Types ─────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QcItem = Record<string, any>;
type ConfirmState = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: "danger" | "warning" | "success";
  onConfirm: (() => void) | null;
};
const closedConfirm: ConfirmState = { open: false, title: "", message: "", confirmLabel: "Confirm", onConfirm: null };

/* ─────────────────── Westgard rule application ─────────────────── */
function applyWestgard(data: QcItem[], mean: number, sd: number): QcItem[] {
  const ann: QcItem[] = data.map((d) => ({ ...d, _status: "normal" as string }));
  for (let i = 0; i < ann.length; i++) {
    const v = Number(ann[i].value);
    const diff = Math.abs(v - mean);
    if (diff > 2 * sd && diff <= 3 * sd) ann[i]._status = "warning";
    if (diff > 3 * sd) ann[i]._status = "failure";
    if (i > 0) {
      const pv = Number(ann[i - 1].value);
      const pd = pv - mean, cd = v - mean;
      if (Math.abs(pd) > 2 * sd && Math.sign(pd) === Math.sign(cd) && Math.abs(cd) > 2 * sd) {
        ann[i - 1]._status = "failure"; ann[i]._status = "failure";
      }
      if ((v > mean + 2 * sd && pv < mean - 2 * sd) || (v < mean - 2 * sd && pv > mean + 2 * sd)) {
        ann[i - 1]._status = "failure"; ann[i]._status = "failure";
      }
    }
  }
  return ann;
}

/* ─────────────────── Field normalizers ─────────────────── */
/* Convert Supabase row → UI shape used throughout the components */

function normMaterial(m: QcItem): QcItem {
  return {
    id: m.id,
    qcName: m.name,
    level: m.level,
    lotNumber: m.lot_number ?? "",
    expiryDate: m.expires_at ? m.expires_at.slice(0, 10) : "",
    mean: m.target_mean,
    sd: m.target_sd,
    units: m.units ?? "μmol/L",
    enabled: m.is_active !== false,
    createdAt: m.created_at ?? "",
  };
}

function normRun(r: QcItem, materialId: string): QcItem {
  return {
    id: r.id,
    qcConfigId: materialId,
    date: (r.date ?? r.run_at ?? "").slice(0, 10),
    value: r.value,
    submitted: true,
    createdAt: r.date ?? r.run_at ?? "",
    resolved: false,
    zScore: r.zScore ?? r.z_score ?? null,
    driftAlert: r.drift_alert ?? null,
    _status: r.status === "rejection" ? "failure" : r.status === "warning" ? "warning" : "normal",
  };
}

function normQualConfig(c: QcItem): QcItem {
  return {
    id: c.id,
    qualitative: true,
    testName: c.test_name,
    resultType: c.result_type ?? "Positive / Negative",
    lotNumber: c.lot_number ?? "",
    manufacturer: c.manufacturer ?? "",
    expiryDate: c.expiry_date ? c.expiry_date.slice(0, 10) : "",
    frequency: c.frequency ?? "Daily",
    controls: c.controls ?? [],
  };
}

function normQualEntry(e: QcItem): QcItem {
  const cfgData = e.qualitative_qc_configs;
  return {
    id: e.id,
    qualitative: true,
    qualEntry: true,
    qcConfigId: e.config_id,
    testName: cfgData?.test_name ?? "",
    lotNumber: "",
    date: (e.run_at ?? "").slice(0, 10),
    controlResults: e.control_results ?? [],
    overallPass: e.overall_pass,
    correctiveAction: e.corrective_action ?? "",
    submitted: e.submitted,
    createdAt: e.created_at ?? e.run_at ?? "",
    enteredBy: e.entered_by ?? "",
    rerunForEntryId: e.rerun_for_entry_id ?? "",
    rerunEntryId: e.rerun_entry_id ?? "",
    followupStatus: e.followup_status ?? "none",
    followupClosedAt: e.followup_closed_at ?? "",
    followupOverrideReason: e.followup_override_reason ?? "",
    resolved: false,
  };
}

/* ─────────────────── Kanta Supabase API ─────────────────── */
function makeKantaApi() {
  const h = () => ({ "Content-Type": "application/json" });

  return {
    /* ── Quantitative configs (qc_materials) ── */
    getMaterials: async (): Promise<QcItem[]> => {
      const res = await fetch(`/api/qc/materials?facility_id=${FACILITY_ID}`);
      const json = await res.json();
      return (json.data ?? []).map(normMaterial);
    },
    saveMaterial: async (form: QcItem, editingId: string | null) => {
      const payload = {
        facility_id: FACILITY_ID,
        name: form.qcName,
        analyte: form.qcName,
        level: Number(form.level),
        lot_number: form.lotNumber || null,
        expires_at: form.expiryDate || null,
        target_mean: parseFloat(form.mean),
        target_sd: parseFloat(form.sd),
        units: form.units,
        is_active: true,
      };
      if (editingId) {
        const r = await queuedFetch(`/api/qc/materials/${editingId}`, { method: "PATCH", headers: h(), body: JSON.stringify(payload) });
        return r.json();
      }
      const r = await queuedFetch(`/api/qc/materials`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
      return r.json();
    },
    toggleMaterial: async (id: string, isActive: boolean) => {
      const r = await queuedFetch(`/api/qc/materials/${id}`, { method: "PATCH", headers: h(), body: JSON.stringify({ is_active: isActive }) });
      return r.json();
    },
    deleteMaterial: async (id: string) => {
      const r = await queuedFetch(`/api/qc/materials/${id}`, { method: "DELETE" });
      return r.json();
    },

    /* ── Quantitative runs (qc_runs) ── */
    getRuns: async (materialId: string): Promise<QcItem[]> => {
      const res = await fetch(`/api/qc/runs?material_id=${materialId}&limit=100`);
      const json = await res.json();
      return (json.data?.points ?? []).map((p: QcItem) => normRun(p, materialId));
    },
    submitRun: async (materialId: string, value: number, runAt: string) => {
      const r = await queuedFetch(`/api/qc/runs`, {
        method: "POST", headers: h(),
        body: JSON.stringify({ material_id: materialId, facility_id: FACILITY_ID, value, run_at: new Date(runAt + "T12:00:00").toISOString() }),
      });
      return r.json();
    },
    deleteRun: async (id: string) => {
      const r = await queuedFetch(`/api/qc/runs/${id}`, { method: "DELETE" });
      return r.json();
    },

    /* ── Qualitative configs ── */
    getQualConfigs: async (): Promise<QcItem[]> => {
      const res = await fetch(`/api/qc/qualitative/configs?facility_id=${FACILITY_ID}`);
      const json = await res.json();
      return (json.data ?? []).map(normQualConfig);
    },
    saveQualConfig: async (form: QcItem, editingId: string | null) => {
      const payload = {
        facility_id: FACILITY_ID,
        test_name: form.testName,
        result_type: form.resultType,
        lot_number: form.lotNumber || null,
        manufacturer: form.manufacturer || null,
        expiry_date: form.expiryDate || null,
        frequency: form.frequency,
        controls: form.controls,
      };
      if (editingId) {
        const r = await queuedFetch(`/api/qc/qualitative/configs/${editingId}`, { method: "PATCH", headers: h(), body: JSON.stringify(payload) });
        return r.json();
      }
      const r = await queuedFetch(`/api/qc/qualitative/configs`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
      return r.json();
    },
    deleteQualConfig: async (id: string) => {
      const r = await queuedFetch(`/api/qc/qualitative/configs/${id}`, { method: "DELETE" });
      return r.json();
    },

    /* ── Qualitative entries ── */
    getQualEntries: async (): Promise<QcItem[]> => {
      const res = await fetch(`/api/qc/qualitative/entries?facility_id=${FACILITY_ID}&limit=100`);
      const json = await res.json();
      return (json.data ?? []).map(normQualEntry);
    },
    saveQualEntry: async (form: QcItem, editingId: string | null) => {
      const payload = {
        facility_id: FACILITY_ID,
        config_id: form.qcConfigId,
        run_at: form.date,
        control_results: form.controlResults,
        overall_pass: form.overallPass,
        corrective_action: form.correctiveAction || null,
        entered_by: form.enteredBy || null,
        submitted: form.submitted,
        rerun_for_entry_id: form.rerunForEntryId || null,
      };
      if (editingId) {
        const r = await queuedFetch(`/api/qc/qualitative/entries/${editingId}`, { method: "PATCH", headers: h(), body: JSON.stringify(payload) });
        return r.json();
      }
      const r = await queuedFetch(`/api/qc/qualitative/entries`, { method: "POST", headers: h(), body: JSON.stringify(payload) });
      return r.json();
    },
    deleteQualEntry: async (id: string) => {
      const r = await queuedFetch(`/api/qc/qualitative/entries/${id}`, { method: "DELETE" });
      return r.json();
    },
    getLotRecommendations: async (): Promise<QcItem[]> => {
      const res = await fetch(`/api/qc/recommendations?facility_id=${FACILITY_ID}`);
      const json = await res.json();
      return json.data ?? [];
    },
    acknowledgeLotRecommendation: async (id: string) => {
      const r = await queuedFetch(`/api/qc/recommendations/${id}/ack`, { method: "PATCH" });
      return r.json();
    },
  };
}

/* ─────────────────── ConfirmModal ─────────────────── */
function ConfirmModal({ open, title, message, confirmLabel, variant = "danger", onConfirm, onCancel }: ConfirmState & { onCancel: () => void }) {
  if (!open) return null;
  const cls =
    variant === "danger"  ? "bg-red-600 hover:bg-red-700" :
    variant === "warning" ? "bg-amber-500 hover:bg-amber-600" :
    "bg-[var(--module-primary)] hover:opacity-90";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 mb-2 text-base">{title}</h3>
        <div className="text-sm text-slate-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={() => onConfirm?.()} className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${cls}`}>{confirmLabel}</button>
          <button onClick={onCancel} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── SectionHead ─────────────────── */
function SectionHead({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-[var(--module-primary-light)] flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="module-accent-text" />
      </div>
      <h3 className="font-semibold text-slate-800" style={{ fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>{title}</h3>
    </div>
  );
}

/* ─────────────────── PassBadge ─────────────────── */
function PassBadge({ pass }: { pass: boolean }) {
  return <StatusBadge variant={pass ? "ok" : "bad"}>{pass ? "Pass" : "Fail"}</StatusBadge>;
}

/* ─────────────────── Tabs ─────────────────── */
type Tab = "config" | "data" | "visual" | "calc" | "stats" | "qual-config" | "qual-entry" | "qual-log";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "config",      label: "QC Config",     icon: ShieldCheck   },
  { id: "data",        label: "Data Entry",    icon: ClipboardList },
  { id: "visual",      label: "Visualization", icon: BarChart3     },
  { id: "calc",        label: "QC Calculator", icon: Calculator    },
  { id: "stats",       label: "QC Stats",      icon: TrendingUp    },
  { id: "qual-config", label: "Qual. Config",  icon: FlaskConical  },
  { id: "qual-entry",  label: "Qual. Entry",   icon: TestTube      },
  { id: "qual-log",    label: "Qual. Log",     icon: Activity      },
];

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                  */
/* ═══════════════════════════════════════════════════════════ */
const VALID_TABS = new Set<Tab>(["config", "data", "visual", "calc", "stats", "qual-config", "qual-entry", "qual-log"]);

function getInitialTab(): Tab {
  if (typeof window !== "undefined") {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab;
    if (t && VALID_TABS.has(t)) return t;
  }
  return "config";
}

export default function QCPage() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);

  return (
    <div className="max-w-[1280px] space-y-5">

      {/* Page header */}
      <div className="animate-slide-up">
        <p className="text-eyebrow mb-1">Quality Management</p>
        <h1 className="text-slate-900" style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
          Quality Control Management
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          QC configuration, data entry, Levey-Jennings visualization, statistics and qualitative QC.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto animate-slide-up">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === id
                ? "border-[var(--module-primary)] module-accent-text"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === "config"      && <QCConfigTab />}
        {activeTab === "data"        && <QCDataEntryTab />}
        {activeTab === "visual"      && <QCVisualizationTab />}
        {activeTab === "calc"        && <QCCalculatorTab />}
        {activeTab === "stats"       && <QCStatsTab />}
        {activeTab === "qual-config" && <QualConfigTab />}
        {activeTab === "qual-entry"  && <QualEntryTab />}
        {activeTab === "qual-log"    && <QualLogTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC CONFIG TAB                                             */
/* ═══════════════════════════════════════════════════════════ */
function QCConfigTab() {
  const api = useMemo(() => makeKantaApi(), []);
  const [qcConfigs, setQcConfigs]   = useState<QcItem[]>([]);
  const [warningLeadDays, setWarningLeadDays] = useState(14);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [confirm, setConfirm]       = useState<ConfirmState>(closedConfirm);
  const [form, setForm] = useState({ qcName: "", level: "", lotNumber: "", expiryDate: "", mean: "", sd: "", units: "μmol/L" });

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true); setError("");
    try {
      const items = await api.getMaterials();
      setQcConfigs(items);
    } catch (e) { setError(`Error fetching QC configs: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  }, [api]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const resetForm = () => {
    setForm({ qcName: "", level: "", lotNumber: "", expiryDate: "", mean: "", sd: "", units: "μmol/L" });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setIsLoading(true);
    if (!form.qcName.trim() || form.level === "" || form.mean === "" || form.sd === "") {
      alert("Please fill all required fields: QC Name, Level, Mean, and SD.");
      setIsLoading(false); return;
    }
    try {
      await api.saveMaterial(form, editingId);
      setSuccess(`QC configuration ${editingId ? "updated" : "saved"} successfully!`);
      fetchConfigs(); resetForm();
    } catch (e) { setError(`Error saving QC config: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleEdit = (config: QcItem) => {
    setForm({ qcName: config.qcName, level: String(config.level), lotNumber: config.lotNumber || "", expiryDate: config.expiryDate || "", mean: String(config.mean), sd: String(config.sd), units: config.units || "μmol/L" });
    setEditingId(String(config.id));
  };

  const handleToggleEnabled = (config: QcItem) => {
    const newEnabled = !config.enabled;
    setConfirm({
      open: true,
      title: newEnabled ? "Enable QC Config?" : "Disable QC Config?",
      message: <>{newEnabled ? "Enable" : "Disable"} <strong>{config.qcName} Level {config.level}</strong>{newEnabled ? " for data entry?" : "? It will no longer appear in QC Data Entry."}</>,
      confirmLabel: newEnabled ? "Enable" : "Disable",
      variant: "warning",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.toggleMaterial(String(config.id), newEnabled);
          setSuccess(`QC config ${newEnabled ? "enabled" : "disabled"} successfully.`); fetchConfigs();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  const handleDelete = (config: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Config?",
      message: <>Are you sure you want to delete <strong>{config.qcName} Level {config.level}</strong>? Existing QC entries will remain but may show incomplete data.</>,
      confirmLabel: "Delete Config", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteMaterial(String(config.id));
          setSuccess("QC configuration deleted successfully!"); fetchConfigs();
          if (editingId === String(config.id)) resetForm();
        } catch (e) { setError(`Error deleting QC config: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  const expiryCalendarRows: QcItem[] = useMemo(() => {
    const today = new Date();
    return qcConfigs
      .filter((cfg) => !!cfg.expiryDate)
      .map((cfg) => {
        const expiry = new Date(String(cfg.expiryDate));
        const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...cfg, daysRemaining } as QcItem;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [qcConfigs]);

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 module-accent-text text-sm"><LoadingBars size="sm" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium">{error}</div>}
      {success && <div className="p-3 bg-[var(--module-primary-light)] border border-slate-200 module-accent-soft-text rounded-xl text-sm font-medium">{success}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <SectionHead icon={ShieldCheck} title="QC Configuration Manager" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">QC Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.qcName} onChange={(e) => setForm({ ...form, qcName: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Level <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Lot Number</label>
              <input type="text" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Mean <span className="text-red-500">*</span></label>
              <input type="number" step="any" value={form.mean} onChange={(e) => setForm({ ...form, mean: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Standard Deviation (SD) <span className="text-red-500">*</span></label>
              <input type="number" step="any" value={form.sd} onChange={(e) => setForm({ ...form, sd: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Units of Measure</label>
              <select value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} className={selectCls}>
                <option value="μmol/L">μmol/L</option>
                <option value="IU/mL">IU/mL</option>
                <option value="g/dL">g/dL</option>
                <option value="mg/dL">mg/dL</option>
                <option value="mmol/L">mmol/L</option>
                <option value="U/L">U/L</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isLoading} className={btnPrimary}>{editingId ? "Update QC Config" : "Save QC Config"}</button>
            <button type="button" onClick={resetForm} className={btnSecondary}>Clear Form</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-semibold text-amber-800">QC Expiry Calendar</h4>
            <label className="text-xs text-slate-600 flex items-center gap-2">
              Amber warning lead time (days)
              <input
                type="number"
                min={1}
                value={warningLeadDays}
                onChange={(e) => setWarningLeadDays(Math.max(1, Number(e.target.value) || 14))}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              />
            </label>
          </div>
          {expiryCalendarRows.length === 0 ? (
            <p className="text-xs text-slate-500">No expiry dates configured yet.</p>
          ) : (
            <div className="space-y-2">
              {expiryCalendarRows.slice(0, 8).map((row) => (
                <div key={String(row.id)} className="flex items-center justify-between rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-800">
                    {row.qcName} L{row.level} {row.lotNumber ? `· ${row.lotNumber}` : ""}
                  </span>
                  <span className="text-slate-600">{row.expiryDate}</span>
                  <span
                    className={
                      row.daysRemaining < 0
                        ? "text-red-700 font-semibold"
                        : row.daysRemaining <= warningLeadDays
                          ? "text-amber-700 font-semibold"
                          : "text-slate-500"
                    }
                  >
                    {row.daysRemaining < 0
                      ? `Expired ${Math.abs(row.daysRemaining)}d ago`
                      : `${row.daysRemaining}d remaining`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <SectionHead icon={BarChart3} title="Existing QC Configurations" />
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["QC Name", "Level", "Units", "Lot Number", "Expiry Date", "Mean", "SD", "Status", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {qcConfigs.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No QC configurations found.</td></tr>
              ) : qcConfigs.map((config) => (
                <tr key={config.id} className="hover:bg-slate-50 transition-colors">
                  <td className={tblCell + " font-semibold text-slate-800"}>{config.qcName}</td>
                  <td className={tblCell}>{config.level}</td>
                  <td className={tblCell}>{config.units || "μmol/L"}</td>
                  <td className={tblCell}>{config.lotNumber || "—"}</td>
                  <td className={tblCell}>{config.expiryDate || "—"}</td>
                  <td className={tblCell + " font-mono"}>{config.mean}</td>
                  <td className={tblCell + " font-mono"}>{config.sd}</td>
                  <td className={tblCell}>
                    {config.enabled
                      ? <StatusBadge variant="ok">Enabled</StatusBadge>
                      : <StatusBadge variant="neutral">Disabled</StatusBadge>}
                  </td>
                  <td className={tblCell}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleEdit(config)} className="module-accent-text hover:text-[var(--module-primary-dark)] font-semibold text-xs">Edit</button>
                      <button onClick={() => handleToggleEnabled(config)} className="text-amber-600 hover:text-amber-800 font-semibold text-xs">{config.enabled ? "Disable" : "Enable"}</button>
                      <button onClick={() => handleDelete(config)} className="text-red-600 hover:text-red-800 font-semibold text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC DATA ENTRY TAB                                         */
/* ═══════════════════════════════════════════════════════════ */
const DRAFT_KEY = "kanta-qc-drafts";

type DraftEntry = { id: string; qcConfigId: string; date: string; value: number };

function loadDrafts(): DraftEntry[] {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]"); } catch { return []; }
}
function saveDrafts(drafts: DraftEntry[]) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch {}
}

function QCDataEntryTab() {
  const api = useMemo(() => makeKantaApi(), []);
  const [qcConfigs, setQcConfigs]           = useState<QcItem[]>([]);
  const [drafts, setDrafts]                 = useState<DraftEntry[]>(() => loadDrafts());
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [qcValue, setQcValue]               = useState("");
  const [selectedDate, setSelectedDate]     = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [confirm, setConfirm]               = useState<ConfirmState>(closedConfirm);

  useEffect(() => {
    api.getMaterials().then((items) => setQcConfigs(items.filter((c) => c.enabled))).catch(() => {});
  }, [api]);

  useEffect(() => { saveDrafts(drafts); }, [drafts]);

  const resetForm = () => { setQcValue(""); setSelectedDate(""); setEditingDraftId(null); };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!selectedConfigId || !selectedDate || !qcValue) { setError("Please fill all required fields."); return; }
    const val = parseFloat(qcValue);
    if (isNaN(val)) { setError("Value must be a number."); return; }
    if (editingDraftId) {
      setDrafts((prev) => prev.map((d) => d.id === editingDraftId ? { ...d, qcConfigId: selectedConfigId, date: selectedDate, value: val } : d));
      setSuccess("Draft updated."); resetForm();
    } else {
      const newDraft: DraftEntry = { id: String(Date.now()), qcConfigId: selectedConfigId, date: selectedDate, value: val };
      setDrafts((prev) => [...prev, newDraft]);
      setSuccess("Entry saved as draft."); resetForm();
    }
  };

  const handleSubmitDraft = async (draft: DraftEntry) => {
    setIsLoading(true); setError("");
    try {
      const res = await api.submitRun(draft.qcConfigId, draft.value, draft.date);
      if (res.error) throw new Error(res.error);
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setSuccess("Entry submitted successfully!");
    } catch (e) { setError(`Error submitting: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleDeleteDraft = (draft: DraftEntry) => {
    const config = qcConfigs.find((c) => c.id === draft.qcConfigId);
    setConfirm({
      open: true, title: "Delete QC Entry?",
      message: <>Are you sure you want to delete this entry <strong>({config?.qcName ?? "?"} Level {config?.level ?? "?"}, {draft.date}, value: {draft.value})</strong>?</>,
      confirmLabel: "Delete", variant: "danger",
      onConfirm: () => {
        setConfirm((c) => ({ ...c, open: false }));
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        if (editingDraftId === draft.id) resetForm();
      },
    });
  };

  const draftEntries = drafts.filter((d) => !selectedConfigId || d.qcConfigId === selectedConfigId);

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 module-accent-text text-sm"><LoadingBars size="sm" /> Submitting…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-[var(--module-primary-light)] border border-slate-200 module-accent-soft-text rounded-xl text-sm">{success}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <SectionHead icon={ClipboardList} title="QC Data Entry" />
        <form onSubmit={handleSaveDraft} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Select QC Config</label>
              <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className={selectCls} required>
                <option value="">-- Choose QC --</option>
                {qcConfigs.map((qc) => <option key={qc.id} value={qc.id}>{qc.qcName} (Level {qc.level}){qc.lotNumber ? ` - Lot: ${qc.lotNumber}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Units of Measure</label>
              <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-100 font-semibold text-slate-700 text-sm min-h-[42px] flex items-center">
                {selectedConfigId ? (qcConfigs.find((c) => c.id === selectedConfigId)?.units || "μmol/L") : "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">QC Value</label>
              <input type="number" step="any" value={qcValue} onChange={(e) => setQcValue(e.target.value)} className={inputCls} required />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className={btnPrimary}>{editingDraftId ? "Update Draft" : "Save Entry"}</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={ClipboardList} title="Draft Entries" />
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["QC Name", "Level", "Date", "Value", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {draftEntries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No draft entries to show.</td></tr>
              ) : draftEntries.map((draft) => {
                const config = qcConfigs.find((c) => c.id === draft.qcConfigId);
                return (
                  <tr key={draft.id} className="hover:bg-slate-50">
                    <td className={tblCell + " font-semibold text-slate-800"}>{config?.qcName || "N/A"}</td>
                    <td className={tblCell}>{config?.level ?? "N/A"}</td>
                    <td className={tblCell + " font-semibold"}>{draft.date}</td>
                    <td className={tblCell}>{draft.value}</td>
                    <td className={tblCell}>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditingDraftId(draft.id); setSelectedConfigId(draft.qcConfigId); setSelectedDate(draft.date); setQcValue(String(draft.value)); }} className="module-accent-text hover:text-[var(--module-primary-dark)] font-semibold text-xs">Edit</button>
                        <button onClick={() => handleDeleteDraft(draft)} className="text-red-600 hover:text-red-800 font-semibold text-xs">Delete</button>
                        <button onClick={() => handleSubmitDraft(draft)} disabled={isLoading} className="module-accent-soft-text hover:text-[var(--module-primary-dark)] font-semibold text-xs disabled:opacity-50">Submit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC VISUALIZATION TAB                                      */
/* ═══════════════════════════════════════════════════════════ */
function QCVisualizationTab() {
  const { facilityAuth, displayName, user } = useAuth();
  const graphHospitalTitle = facilityBrandingLine(
    facilityAuth?.hospitalName,
    facilityAuth?.groupId,
    facilityAuth?.branchName
  ).toUpperCase();
  const api = useMemo(() => makeKantaApi(), []);
  const [qcConfigs, setQcConfigs]                 = useState<QcItem[]>([]);
  const [runs1, setRuns1]                         = useState<QcItem[]>([]);
  const [runs2, setRuns2]                         = useState<QcItem[]>([]);
  const [previousLotRuns, setPreviousLotRuns]     = useState<QcItem[]>([]);
  const [selectedConfigId, setSelectedConfigId]   = useState("");
  const [selectedConfigId2, setSelectedConfigId2] = useState("");
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; });
  const [toDate, setToDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [visualError, setVisualError] = useState("");
  const graphRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    api.getMaterials().then(setQcConfigs).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!selectedConfigId) { setRuns1([]); return; }
    api.getRuns(selectedConfigId).then(setRuns1).catch(() => {});
  }, [api, selectedConfigId]);

  useEffect(() => {
    if (!selectedConfigId2) { setRuns2([]); return; }
    api.getRuns(selectedConfigId2).then(setRuns2).catch(() => {});
  }, [api, selectedConfigId2]);

  const filterRuns = (runs: QcItem[]) => {
    let entries = runs;
    if (fromDate) entries = entries.filter((e) => e.date >= fromDate);
    if (toDate)   entries = entries.filter((e) => e.date <= toDate);
    return entries;
  };

  const selectedConfig  = qcConfigs.find((c) => c.id === selectedConfigId);
  const selectedConfig2 = qcConfigs.find((c) => c.id === selectedConfigId2);
  const previousLotConfig = useMemo(() => {
    if (!selectedConfig) return null;
    const candidates = qcConfigs
      .filter((cfg) =>
        cfg.id !== selectedConfig.id &&
        cfg.qcName === selectedConfig.qcName &&
        String(cfg.level) === String(selectedConfig.level) &&
        (cfg.lotNumber ?? "") !== (selectedConfig.lotNumber ?? "")
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return candidates[0] ?? null;
  }, [qcConfigs, selectedConfig]);

  useEffect(() => {
    if (!previousLotConfig?.id) {
      setPreviousLotRuns([]);
      return;
    }
    api.getRuns(previousLotConfig.id).then(setPreviousLotRuns).catch(() => setPreviousLotRuns([]));
  }, [api, previousLotConfig?.id]);
  const filtered1 = filterRuns(runs1);
  const filtered2 = filterRuns(runs2);
  const analyzed1 = selectedConfig  && filtered1.length > 0 ? applyWestgard(filtered1.map((e) => ({ ...e, name: fmtShort(e.date) })), Number(selectedConfig.mean),  Number(selectedConfig.sd))  : [];
  const analyzed2 = selectedConfig2 && filtered2.length > 0 ? applyWestgard(filtered2.map((e) => ({ ...e, name: fmtShort(e.date) })), Number(selectedConfig2.mean), Number(selectedConfig2.sd)) : [];
  const driftAlerts = [...analyzed1, ...analyzed2].filter((d) => d.driftAlert);
  const lotTransitionFirstRuns = useMemo(() => (runs1 ?? []).slice(0, 10), [runs1]);
  const previousLotValues = useMemo(
    () => (previousLotRuns ?? []).map((r) => Number(r.value)).filter((v) => !Number.isNaN(v)),
    [previousLotRuns]
  );
  const previousLotBaseline = useMemo(() => {
    if (!previousLotValues.length) return null;
    const mean = previousLotValues.reduce((sum, v) => sum + v, 0) / previousLotValues.length;
    const sd = Math.sqrt(
      previousLotValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / previousLotValues.length
    );
    return { mean, sd };
  }, [previousLotValues]);
  const lotTransitionSummary = useMemo(() => {
    if (!lotTransitionFirstRuns.length || !previousLotBaseline) return null;
    const firstValues = lotTransitionFirstRuns.map((r) => Number(r.value)).filter((v) => !Number.isNaN(v));
    if (!firstValues.length) return null;
    const mean = firstValues.reduce((sum, v) => sum + v, 0) / firstValues.length;
    const sd = Math.sqrt(firstValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / firstValues.length);
    const meanShift = mean - previousLotBaseline.mean;
    const meanShiftPct = previousLotBaseline.mean !== 0 ? (meanShift / previousLotBaseline.mean) * 100 : 0;
    const recommendation =
      Math.abs(meanShiftPct) <= 5 ? "Acceptable transition" : Math.abs(meanShiftPct) <= 10 ? "Monitor closely" : "Investigate lot";
    return {
      firstMean: mean,
      firstSd: sd,
      baselineMean: previousLotBaseline.mean,
      baselineSd: previousLotBaseline.sd,
      meanShift,
      meanShiftPct,
      recommendation,
    };
  }, [lotTransitionFirstRuns, previousLotBaseline]);

  const renderGraph = (config: QcItem, data: QcItem[], compact = false) => {
    const mean = Number(config.mean), sd = Number(config.sd);
    const yLabel = `${config.qcName} Level ${config.level} (${config.units || "μmol/L"})`;
    const labels = data.map((d) => String(d.name ?? ""));
    const values = data.map((d) => Number(d.value));
    const pointColors = data.map((d) =>
      d._status === "failure" ? STATUS.BAD : d._status === "warning" ? STATUS.WARN : STATUS.OK
    );

    const chartData: ChartData<"line"> = {
      labels,
      datasets: [
        // main series (with colored points)
        {
          label: "QC Value",
          data: values,
          borderColor: STRUCTURE.TEXT,
          borderWidth: 1.5,
          pointRadius: 5,
          pointHoverRadius: 6,
          pointBackgroundColor: pointColors,
          pointBorderColor: STRUCTURE.TEXT,
          pointBorderWidth: 1,
          tension: 0,
        },
        { label: "Mean",  data: labels.map(() => mean),          borderColor: STRUCTURE.TEXT, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 },
        { label: "+1 SD", data: labels.map(() => mean + sd),     borderColor: STATUS.OK, borderWidth: 1,   borderDash: [3, 3], pointRadius: 0 },
        { label: "-1 SD", data: labels.map(() => mean - sd),     borderColor: STATUS.OK, borderWidth: 1,   borderDash: [3, 3], pointRadius: 0 },
        { label: "+2 SD", data: labels.map(() => mean + 2 * sd), borderColor: STATUS.WARN, borderWidth: 1,   borderDash: [3, 3], pointRadius: 0 },
        { label: "-2 SD", data: labels.map(() => mean - 2 * sd), borderColor: STATUS.WARN, borderWidth: 1,   borderDash: [3, 3], pointRadius: 0 },
        { label: "+3 SD", data: labels.map(() => mean + 3 * sd), borderColor: STATUS.BAD, borderWidth: 1.5, pointRadius: 0 },
        { label: "-3 SD", data: labels.map(() => mean - 3 * sd), borderColor: STATUS.BAD, borderWidth: 1.5, pointRadius: 0 },
      ],
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#f8fafc",
          titleColor: "#0f172a",
          bodyColor: "#334155",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          callbacks: {
            title: (items) => items[0]?.label ?? "",
            label: (ctx) => {
              if (ctx.datasetIndex !== 0) return "";
              const v = Number(ctx.parsed.y ?? 0);
              const status = data[ctx.dataIndex]?._status;
              const drift = data[ctx.dataIndex]?.driftAlert;
              const tag = status === "failure" ? "Violation" : status === "warning" ? "Warning" : "Normal";
              return drift
                ? `Value: ${v} (${tag}, Drift: ${drift.direction} over ${drift.window} runs)`
                : `Value: ${v} (${tag})`;
            },
          },
          filter: (item) => item.datasetIndex === 0,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { size: 11 }, maxRotation: 45 },
        },
        y: {
          min: mean - 3 * sd,
          max: mean + 3 * sd,
          grid: { color: CHART_AXIS.grid },
          ticks: {
            color: "#64748b",
            font: { size: 10 },
            callback: (v) => Number(v).toFixed(2),
          },
          title: {
            display: true,
            text: yLabel,
            color: "#475569",
            font: { size: 11, weight: 600 },
          },
        },
      },
    };
    const downloadGraphPdf = async () => {
      const graphNode = graphRefs.current[String(config.id)];
      const canvas = graphNode?.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        setVisualError("Could not find graph canvas to download. Try again.");
        return;
      }
      try {
        const { jsPDF } = await import("jspdf");
        const imageData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "pt",
          format: "a4",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const title = `${graphHospitalTitle} - ${config.qcName} Level ${config.level}`;
        const lotLabel = config.lotNumber ? `Lot: ${config.lotNumber}` : "Lot: —";
        const dateLabel =
          fromDate && toDate
            ? `Filtered dates: ${fromDate} to ${toDate}`
            : fromDate
              ? `Filtered dates: from ${fromDate}`
              : toDate
                ? `Filtered dates: to ${toDate}`
                : "Filtered dates: all";

        const preparedBy =
          displayName?.trim() || user?.email?.trim() || "Unknown preparer";
        const printedAt = new Date();
        const printedAtLabel = printedAt.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const rangeSlug =
          fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `from_${fromDate}` : toDate ? `to_${toDate}` : "all_dates";

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(title, 28, 30);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`${config.qcName} (Level ${config.level})`, 28, 44);
        pdf.text(lotLabel, 28, 56);
        pdf.text(dateLabel, 28, 68);
        pdf.text(`Prepared by: ${preparedBy}`, 28, 80);
        pdf.text(`Printed/Downloaded at: ${printedAtLabel}`, 28, 92);

        const maxImageWidth = pageWidth - 56;
        const maxImageHeight = pageHeight - 84;
        const ratio = Math.min(maxImageWidth / canvas.width, maxImageHeight / canvas.height);
        const renderWidth = canvas.width * ratio;
        const renderHeight = canvas.height * ratio;
        const x = (pageWidth - renderWidth) / 2;
        const y = 110;

        pdf.addImage(imageData, "PNG", x, y, renderWidth, renderHeight);
        pdf.save(
          `LJ_${String(config.qcName).replace(/\s+/g, "_")}_L${config.level}_Lot-${(config.lotNumber ?? "NoLot").replace(/\s+/g, "_")}_${rangeSlug}_${todayStr()}.pdf`.replace(
            /[^a-zA-Z0-9_\\-\\.]/g,
            "_"
          )
        );
        setVisualError("");
      } catch {
        setVisualError("Failed to generate PDF. Please try again.");
      }
    };
    return (
      <div
        key={config.id}
        ref={(node) => {
          graphRefs.current[String(config.id)] = node;
        }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
      >
        <div className="text-center border-b border-slate-100 pb-4 mb-4">
          <div className="mb-2 flex justify-end">
            <button type="button" onClick={() => void downloadGraphPdf()} className={btnSecondary}>
              <Download size={14} /> Download L-J Graph PDF
            </button>
          </div>
          <h3 className={`font-bold text-slate-800 uppercase tracking-wide ${compact ? "text-sm" : "text-base"}`}>{graphHospitalTitle} QUALITY CONTROL GRAPH</h3>
          <h4 className={`font-bold text-slate-900 mt-1 ${compact ? "text-lg" : "text-2xl"}`}>{config.qcName} Level {config.level}</h4>
          {config.lotNumber && <p className="text-slate-500 text-xs mt-0.5">Control Lot: {config.lotNumber}</p>}
          {(fromDate || toDate) && (
            <p className="text-slate-400 text-xs mt-0.5">
              {fromDate && toDate ? `${fmtDate(fromDate)} – ${fmtDate(toDate)}` : fromDate ? `From ${fmtDate(fromDate)}` : `To ${fmtDate(toDate)}`}
            </p>
          )}
        </div>
        <div style={{ height: compact ? 260 : 380 }}>
          <LazyLine data={chartData} options={options} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 justify-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--module-primary)] inline-block" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 1₂s Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Westgard Violation</span>
        </div>
      </div>
    );
  };

  const hasBoth = !!(selectedConfigId && selectedConfigId2 && analyzed1.length > 0 && analyzed2.length > 0);

  return (
    <div className="space-y-5">
      {visualError && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{visualError}</div>}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={BarChart3} title="Visualization" />
        <div className="flex flex-wrap gap-3">
          <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400">
            <option value="">Select QC Config 1</option>
            {qcConfigs.map((qc) => <option key={qc.id} value={qc.id}>{qc.qcName} (Level {qc.level}){qc.lotNumber ? ` - Lot: ${qc.lotNumber}` : ""}</option>)}
          </select>
          <select value={selectedConfigId2} onChange={(e) => setSelectedConfigId2(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400">
            <option value="">+ Add 2nd graph (optional)</option>
            {qcConfigs.filter((qc) => qc.id !== selectedConfigId).map((qc) => <option key={qc.id} value={qc.id}>{qc.qcName} (Level {qc.level}){qc.lotNumber ? ` - Lot: ${qc.lotNumber}` : ""}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
          <input type="date" value={toDate}   onChange={(e) => setToDate(e.target.value)}   className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400" />
        </div>
      </div>
      {driftAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Proactive Drift Alerts</h4>
          <div className="space-y-2">
            {driftAlerts.slice(-6).map((item, idx) => (
              <div key={`${item.id ?? idx}-drift`} className="flex items-center justify-between text-xs bg-white border border-amber-100 rounded-lg px-3 py-2">
                <span className="font-semibold text-slate-800">{item.name}</span>
                <span className="text-slate-600">Z {Number(item.zScore ?? 0).toFixed(2)}</span>
                <span className="text-amber-700">
                  {item.driftAlert.direction === "positive" ? "Upward drift" : "Downward drift"} ({item.driftAlert.window} runs)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedConfig && previousLotConfig && lotTransitionSummary && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Lot Transition Comparison (first 10 runs)</h4>
          <p className="text-xs text-slate-500 mb-3">
            New lot <strong>{selectedConfig.lotNumber || "—"}</strong> vs previous lot{" "}
            <strong>{previousLotConfig.lotNumber || "—"}</strong> for {selectedConfig.qcName} level {selectedConfig.level}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="text-slate-500">Previous lot baseline</div>
              <div className="font-semibold text-slate-800">Mean {lotTransitionSummary.baselineMean.toFixed(3)}</div>
              <div className="text-slate-600">SD {lotTransitionSummary.baselineSd.toFixed(3)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="text-slate-500">First 10 runs (new lot)</div>
              <div className="font-semibold text-slate-800">Mean {lotTransitionSummary.firstMean.toFixed(3)}</div>
              <div className="text-slate-600">SD {lotTransitionSummary.firstSd.toFixed(3)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="text-slate-500">Mean shift</div>
              <div className="font-semibold text-slate-800">
                {lotTransitionSummary.meanShift.toFixed(3)} ({lotTransitionSummary.meanShiftPct.toFixed(1)}%)
              </div>
              <div className="text-slate-600">{lotTransitionSummary.recommendation}</div>
            </div>
          </div>
        </div>
      )}

      {((selectedConfig && analyzed1.length > 0) || (selectedConfig2 && analyzed2.length > 0)) ? (
        <div className="space-y-5">
          {selectedConfig  && analyzed1.length > 0 && renderGraph(selectedConfig,  analyzed1, hasBoth)}
          {selectedConfig2 && analyzed2.length > 0 && renderGraph(selectedConfig2, analyzed2, hasBoth)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
          {(selectedConfigId || selectedConfigId2)
            ? "No QC runs found for the selected configuration(s) and date range."
            : "Select a QC configuration and date range to view the Levey-Jennings chart."}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QC CALCULATOR TAB  (localStorage only — no API)           */
/* ═══════════════════════════════════════════════════════════ */
function QCCalculatorTab() {
  const [inputs, setInputs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-inputs") ?? "null") || Array(25).fill(""); } catch { return Array(25).fill(""); }
  });
  const [mean, setMean] = useState<number | null>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-mean-sd") ?? "null")?.mean ?? null; } catch { return null; }
  });
  const [sd, setSD] = useState<number | null>(() => {
    try { return JSON.parse(localStorage.getItem("kanta-qc-calc-mean-sd") ?? "null")?.sd ?? null; } catch { return null; }
  });
  const [error, setError]   = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { localStorage.setItem("kanta-qc-calc-inputs", JSON.stringify(inputs)); } catch {} }, [inputs]);
  useEffect(() => { try { localStorage.setItem("kanta-qc-calc-mean-sd", JSON.stringify({ mean, sd })); } catch {} }, [mean, sd]);

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

  const handleReset = () => {
    setInputs(Array(25).fill("")); setMean(null); setSD(null); setError(""); setCopied(false);
    try { localStorage.removeItem("kanta-qc-calc-inputs"); localStorage.removeItem("kanta-qc-calc-mean-sd"); } catch {}
  };

  const handleCopy = () => {
    if (mean != null && sd != null) {
      navigator.clipboard.writeText(`Mean: ${mean}\nSD: ${sd}`);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <SectionHead icon={Calculator} title="QC Mean & SD Calculator" />
        <p className="text-sm text-slate-500 mb-5">Enter up to 25 QC run values to calculate the Mean and Standard Deviation for a new control lot.</p>
        <form onSubmit={handleCalculate} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {inputs.map((val, idx) => (
              <input key={idx} type="number" step="any" value={val} onChange={(e) => handleChange(idx, e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 transition-all"
                placeholder={`Value ${idx + 1}`} required />
            ))}
          </div>
          {error && <p className="text-sm text-red-600 font-medium text-center">{error}</p>}
          <div className="flex flex-wrap gap-3 justify-center">
            <button type="submit" className={btnPrimary}><Calculator size={14} /> Calculate</button>
            <button type="button" onClick={handleReset} className={btnSecondary}>Reset</button>
            <button type="button" onClick={handleCopy} disabled={mean == null} className={btnSecondary + " disabled:opacity-50"}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Results</>}
            </button>
          </div>
        </form>
      </div>

      {mean != null && sd != null && (
        <div className="bg-[var(--module-primary-light)] border border-slate-200 rounded-2xl p-6">
          <h3 className="font-semibold text-[var(--module-primary-dark)] mb-4">Results</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-widest module-accent-text mb-1">Mean</p>
              <p className="text-2xl font-bold module-accent-soft-text" style={{ letterSpacing: "-0.03em" }}>{mean.toFixed(4)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-widest module-accent-text mb-1">Std Deviation</p>
              <p className="text-2xl font-bold module-accent-soft-text" style={{ letterSpacing: "-0.03em" }}>{sd.toFixed(4)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm module-accent-soft-text">
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
/*  QC STATS TAB                                              */
/* ═══════════════════════════════════════════════════════════ */
function QCStatsTab() {
  const api = useMemo(() => makeKantaApi(), []);
  const [qcConfigs, setQcConfigs]           = useState<QcItem[]>([]);
  const [lotRecommendations, setLotRecommendations] = useState<QcItem[]>([]);
  const [runs, setRuns]                     = useState<QcItem[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [reportMonth, setReportMonth]       = useState(() => new Date().toISOString().slice(0, 7));
  const [error, setError]                   = useState("");
  const [confirm, setConfirm]               = useState<ConfirmState>(closedConfirm);
  const [loadingRuns, setLoadingRuns]       = useState(false);

  useEffect(() => {
    api.getMaterials().then(setQcConfigs).catch(() => {});
    api.getLotRecommendations().then(setLotRecommendations).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!selectedConfig) { setRuns([]); return; }
    setLoadingRuns(true);
    api.getRuns(selectedConfig).then(setRuns).catch(() => setRuns([])).finally(() => setLoadingRuns(false));
  }, [api, selectedConfig]);

  useEffect(() => {
    if (!selectedConfig || runs.length === 0) return;
    const hasRowsForSelectedMonth = runs.some((item) => String(item.date || "").slice(0, 7) === reportMonth);
    if (hasRowsForSelectedMonth) return;
    const latestMonth = [...runs]
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
      ?.date
      ?.slice(0, 7);
    if (latestMonth) setReportMonth(latestMonth);
  }, [selectedConfig, runs, reportMonth]);

  const selectedConfigObj = qcConfigs.find((c) => c.id === selectedConfig);
  const filteredData = useMemo(() => {
    if (!selectedConfig || !runs.length) return [];
    let filtered = runs;
    if (startDate) filtered = filtered.filter((item) => item.date >= startDate);
    if (endDate)   filtered = filtered.filter((item) => item.date <= endDate);
    return filtered.sort((a, b) => a.date < b.date ? 1 : -1);
  }, [selectedConfig, startDate, endDate, runs]);
  const monthlyData = useMemo(() => {
    if (!selectedConfig || !runs.length || !reportMonth) return [];
    return runs
      .filter((item) => String(item.date || "").slice(0, 7) === reportMonth)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [selectedConfig, reportMonth, runs]);

  const statistics = useMemo(() => {
    const values = filteredData.map((item) => parseFloat(item.value)).filter((v) => !isNaN(v));
    if (!values.length) return null;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    return { count: values.length, mean: mean.toFixed(3), sd: sd.toFixed(3), min: Math.min(...values).toFixed(3), max: Math.max(...values).toFixed(3) };
  }, [filteredData]);

  const handleDelete = (item: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Entry?",
      message: <>Are you sure you want to delete this QC entry <strong>({item.date}, value: {item.value})</strong>? This cannot be undone.</>,
      confirmLabel: "Delete", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await api.deleteRun(String(item.id));
          setRuns((prev) => prev.filter((r) => r.id !== item.id));
        } catch (e) { setError(`Error deleting: ${(e as Error).message}`); }
      },
    });
  };

  const handleAcknowledgeRecommendation = async (id: string) => {
    try {
      await api.acknowledgeLotRecommendation(String(id));
      setLotRecommendations((prev) => prev.filter((item) => String(item.id) !== String(id)));
    } catch (e) {
      setError(`Failed to acknowledge recommendation: ${(e as Error).message}`);
    }
  };

  const handleExportCSV = () => {
    if (!selectedConfig || !filteredData.length) return;
    const configLabel = selectedConfigObj ? `${selectedConfigObj.qcName} Level ${selectedConfigObj.level}` : selectedConfig;
    const rows: (string | number | null)[][] = [
      ["QC Statistics Export"], ["Configuration", configLabel],
      ["Date Range", startDate && endDate ? `${startDate} to ${endDate}` : "All"],
      [], ["Date", "Value", "Z-Score", "Status"],
    ];
    filteredData.forEach((item) => {
      rows.push([item.date, item.value, item.zScore ?? "—", item._status ?? "normal"]);
    });
    downloadCSV(rows, `QC_Statistics_${configLabel.replace(/\s+/g, "_")}_${todayStr()}.csv`);
  };

  const handleExportMonthlyPDF = () => {
    if (!selectedConfigObj || monthlyData.length === 0) return;
    const configLabel = `${selectedConfigObj.qcName} Level ${selectedConfigObj.level}${selectedConfigObj.lotNumber ? ` · Lot ${selectedConfigObj.lotNumber}` : ""}`;
    const total = monthlyData.length;
    const violations = monthlyData.filter((item) => item._status === "failure");
    const warnings = monthlyData.filter((item) => item._status === "warning");
    const passes = total - violations.length;
    const passRate = total > 0 ? ((passes / total) * 100).toFixed(1) : "0.0";
    const rowsHtml = monthlyData
      .map(
        (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.date}</td>
            <td>${Number(item.value).toFixed(3)}</td>
            <td>${item.zScore != null ? Number(item.zScore).toFixed(2) : "—"}</td>
            <td>${item._status === "failure" ? "Violation" : item._status === "warning" ? "Warning" : "Normal"}</td>
          </tr>
        `
      )
      .join("");
    const violationRowsHtml =
      violations.length === 0
        ? `<tr><td colspan="4">No Westgard violations in this month.</td></tr>`
        : violations
            .map(
              (item) => `
                <tr>
                  <td>${item.date}</td>
                  <td>${Number(item.value).toFixed(3)}</td>
                  <td>${item.zScore != null ? Number(item.zScore).toFixed(2) : "—"}</td>
                  <td>${item._status}</td>
                </tr>
              `
            )
            .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>QC Monthly Summary - ${configLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 { font-size: 18px; margin-bottom: 6px; }
            h2 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; }
            p { margin: 4px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
            th { background: #f8fafc; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
            .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
          </style>
        </head>
        <body>
          <h1>Kanta QC Monthly Summary</h1>
          <p><strong>Analyte:</strong> ${configLabel}</p>
          <p><strong>Month:</strong> ${reportMonth}</p>
          <div class="summary">
            <div class="card"><strong>Total Runs</strong><br/>${total}</div>
            <div class="card"><strong>Pass Rate</strong><br/>${passRate}%</div>
            <div class="card"><strong>Warnings</strong><br/>${warnings.length}</div>
            <div class="card"><strong>Violations</strong><br/>${violations.length}</div>
          </div>
          <h2>Levey-Jennings Data Points</h2>
          <table>
            <thead><tr><th>#</th><th>Date</th><th>Value</th><th>Z-Score</th><th>Status</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <h2>Westgard Violations</h2>
          <table>
            <thead><tr><th>Date</th><th>Value</th><th>Z-Score</th><th>Classification</th></tr></thead>
            <tbody>${violationRowsHtml}</tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {lotRecommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Review Lot Recommendations</h3>
          <div className="space-y-2">
            {lotRecommendations.map((rec) => (
              <div key={String(rec.id)} className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3">
                <div className="text-xs text-slate-700">
                  <div className="font-semibold">
                    {rec.analyte} {rec.lot_number ? `· Lot ${rec.lot_number}` : ""}
                  </div>
                  <div className="text-slate-500">
                    {rec.violation_count} flagged Westgard runs in last {rec.window_days} days
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAcknowledgeRecommendation(String(rec.id))}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <SectionHead icon={TrendingUp} title="Filter Options" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Select QC Configuration</label>
            <select value={selectedConfig} onChange={(e) => setSelectedConfig(e.target.value)} className={selectCls}>
              <option value="">-- Select Configuration --</option>
              {qcConfigs.map((config) => <option key={config.id} value={config.id}>{config.qcName} - Level {config.level}{config.lotNumber ? ` - Lot: ${config.lotNumber}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Report Month</label>
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {loadingRuns && <div className="flex items-center gap-2 module-accent-text text-sm"><LoadingBars size="sm" /> Loading runs…</div>}

      {statistics && (
        <div className="bg-[var(--module-primary-light)] border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[var(--module-primary-dark)] mb-4 uppercase tracking-wider">Statistics Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total Values", value: statistics.count },
              { label: "Mean",         value: statistics.mean  },
              { label: "Std Dev",      value: statistics.sd    },
              { label: "Minimum",      value: statistics.min   },
              { label: "Maximum",      value: statistics.max   },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold module-accent-soft-text">{value}</div>
                <div className="text-xs module-accent-text mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SectionHead icon={ClipboardList} title="QC Values" />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleExportCSV} disabled={!selectedConfig || !filteredData.length} className={btnSecondary + " disabled:opacity-40"}>
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={handleExportMonthlyPDF}
              disabled={!selectedConfig || monthlyData.length === 0}
              className={btnSecondary + " disabled:opacity-40"}
            >
              <Download size={14} /> Export Monthly PDF
            </button>
          </div>
        </div>
        {filteredData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {selectedConfig ? "No QC values found for the selected configuration and date range." : "Please select a QC configuration to view statistics."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Date", "Value", "Z-Score", "Status", ""].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item, idx) => {
                  const isFailure = item._status === "failure";
                  const hasDrift = !!item.driftAlert;
                  return (
                    <tr key={item.id ?? idx} className="hover:bg-slate-50 transition-colors">
                      <td className={tblCell}>{fmtDate(item.date)}</td>
                      <td className={tblCell + " font-mono font-bold module-accent-soft-text"}>{item.value}</td>
                      <td className={tblCell + " font-mono text-slate-500"}>{item.zScore != null ? Number(item.zScore).toFixed(2) : "—"}</td>
                      <td className={tblCell}>
                        {isFailure
                          ? <StatusBadge variant="bad">Violation</StatusBadge>
                          : hasDrift
                          ? <StatusBadge variant="warn">Drift Alert</StatusBadge>
                          : item._status === "warning"
                          ? <StatusBadge variant="warn">Warning</StatusBadge>
                          : <StatusBadge variant="ok">Normal</StatusBadge>}
                      </td>
                      <td className={tblCell}>
                        <button onClick={() => handleDelete(item)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC CONFIG TAB                                 */
/* ═══════════════════════════════════════════════════════════ */
const RESULT_TYPES = ["Reactive / Non-Reactive", "Positive / Negative", "Detected / Not Detected", "Pass / Fail"];
const FREQUENCIES  = ["Daily", "Weekly", "Per Batch"];
const LEVEL_OPTIONS = ["Positive Control", "Negative Control"];

function getExpectedOptions(resultType: string) {
  if (!resultType) return ["Reactive", "Non-Reactive"];
  const parts = resultType.split(" / ");
  return [parts[0]?.trim() ?? "", parts[1]?.trim() ?? ""];
}

const blankQualForm = () => ({
  testName: "", resultType: RESULT_TYPES[0], lotNumber: "", manufacturer: "", expiryDate: "", frequency: "Daily",
  controls: [{ name: "", level: LEVEL_OPTIONS[0], expectedResult: "", notes: "" }],
});

function QualConfigTab() {
  const api = useMemo(() => makeKantaApi(), []);
  const [form, setForm]             = useState(blankQualForm());
  const [configs, setConfigs]       = useState<QcItem[]>([]);
  const [warningLeadDays, setWarningLeadDays] = useState(14);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [confirm, setConfirm]       = useState<ConfirmState>(closedConfirm);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      setConfigs(await api.getQualConfigs());
    } catch (e) { setError(`Error fetching configs: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  }, [api]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const resetForm = () => { setForm(blankQualForm()); setEditingId(null); setError(""); setSuccess(""); };
  const expiryCalendarRows: QcItem[] = useMemo(() => {
    const today = new Date();
    return configs
      .filter((cfg) => !!cfg.expiryDate)
      .map((cfg) => {
        const expiry = new Date(String(cfg.expiryDate));
        const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...cfg, daysRemaining } as QcItem;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [configs]);

  const updateControl = (idx: number, field: string, value: string) => {
    setForm({ ...form, controls: form.controls.map((c, i) => i === idx ? { ...c, [field]: value } : c) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.testName.trim()) { setError("Test Name is required."); return; }
    for (const c of form.controls) {
      if (!c.name.trim() || !c.expectedResult) { setError("Each control must have a name and an expected result."); return; }
    }
    setIsLoading(true);
    try {
      await api.saveQualConfig(form, editingId);
      setSuccess(`Configuration ${editingId ? "updated" : "saved"} successfully!`);
      fetchConfigs(); resetForm();
    } catch (e) { setError(`Error saving config: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleDelete = (config: QcItem) => {
    setConfirm({
      open: true, title: "Delete Qualitative QC Config?",
      message: <>Are you sure you want to delete <strong>{config.testName}</strong>? Existing QC run records will remain.</>,
      confirmLabel: "Delete Config", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteQualConfig(String(config.id)); setSuccess("Configuration deleted."); fetchConfigs();
          if (editingId === String(config.id)) resetForm();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  const expectedOptions = getExpectedOptions(form.resultType);

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 module-accent-text text-sm"><LoadingBars size="sm" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-[var(--module-primary-light)] border border-slate-200 module-accent-soft-text rounded-xl text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6">
        <SectionHead icon={FlaskConical} title={`${editingId ? "Edit" : ""} Qualitative QC Configuration`} />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider module-accent-text mb-3 flex items-center gap-2">Test Information <span className="flex-1 h-px bg-[var(--module-primary)]/25 ml-2" /></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Test Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} placeholder="e.g. HIV Rapid Test" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Result Type <span className="text-red-500">*</span></label>
              <select value={form.resultType} onChange={(e) => setForm({ ...form, resultType: e.target.value })} className={selectCls}>
                {RESULT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={selectCls}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Manufacturer / Kit Name</label>
              <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Determine™ HIV 1/2" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Lot Number</label>
              <input type="text" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="e.g. LOT-2025-HIV-04" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider module-accent-text mb-3 flex items-center gap-2">Control Levels &amp; Expected Results <span className="flex-1 h-px bg-[var(--module-primary)]/25 ml-2" /></h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Control Name", "Level", "Expected Result", "Notes", ""].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {form.controls.map((ctrl, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="text" value={ctrl.name} onChange={(e) => updateControl(idx, "name", e.target.value)} placeholder="e.g. Strong Positive Control" className={inputCls} required /></td>
                    <td className="px-4 py-3"><select value={ctrl.level} onChange={(e) => updateControl(idx, "level", e.target.value)} className={selectCls}>{LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}</select></td>
                    <td className="px-4 py-3"><select value={ctrl.expectedResult} onChange={(e) => updateControl(idx, "expectedResult", e.target.value)} className={selectCls} required><option value="">-- Select --</option>{expectedOptions.map((o) => <option key={o} value={o}>{o}</option>)}</select></td>
                    <td className="px-4 py-3"><input type="text" value={ctrl.notes} onChange={(e) => updateControl(idx, "notes", e.target.value)} placeholder="e.g. Strong band at C and T" className={inputCls} /></td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => { if (form.controls.length > 1) setForm({ ...form, controls: form.controls.filter((_, i) => i !== idx) }); }} disabled={form.controls.length === 1}
                        className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 disabled:opacity-30 transition-all">
                        <XIcon size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setForm({ ...form, controls: [...form.controls, { name: "", level: LEVEL_OPTIONS[0], expectedResult: "", notes: "" }] })}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--module-primary)]/35 rounded-xl module-accent-text font-semibold text-sm hover:bg-[var(--module-primary-light)] transition">
            <Plus size={14} /> Add Control Level
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={isLoading} className={btnPrimary}>{editingId ? "Update Configuration" : "Save Configuration"}</button>
          <button type="button" onClick={resetForm} className={btnSecondary}>Clear Form</button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-semibold text-amber-800">Qualitative QC Expiry Calendar</h4>
            <label className="text-xs text-slate-600 flex items-center gap-2">
              Amber warning lead time (days)
              <input
                type="number"
                min={1}
                value={warningLeadDays}
                onChange={(e) => setWarningLeadDays(Math.max(1, Number(e.target.value) || 14))}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              />
            </label>
          </div>
          {expiryCalendarRows.length === 0 ? (
            <p className="text-xs text-slate-500">No qualitative lot expiry dates configured yet.</p>
          ) : (
            <div className="space-y-2">
              {expiryCalendarRows.slice(0, 8).map((row) => (
                <div key={String(row.id)} className="flex items-center justify-between rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-800">
                    {row.testName} {row.lotNumber ? `· ${row.lotNumber}` : ""}
                  </span>
                  <span className="text-slate-600">{row.expiryDate}</span>
                  <span
                    className={
                      row.daysRemaining < 0
                        ? "text-red-700 font-semibold"
                        : row.daysRemaining <= warningLeadDays
                          ? "text-amber-700 font-semibold"
                          : "text-slate-500"
                    }
                  >
                    {row.daysRemaining < 0
                      ? `Expired ${Math.abs(row.daysRemaining)}d ago`
                      : `${row.daysRemaining}d remaining`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <SectionHead icon={FlaskConical} title="Existing Qualitative QC Configurations" />
        {configs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No qualitative QC configurations found. Create one above.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Test Name", "Result Type", "Controls", "Lot Number", "Expiry", "Frequency", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {configs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tblCell + " font-semibold text-slate-800"}>{cfg.testName}</td>
                    <td className={tblCell}>{cfg.resultType}</td>
                    <td className={tblCell}><StatusBadge variant="neutral">{cfg.controls?.length || 0} control{cfg.controls?.length !== 1 ? "s" : ""}</StatusBadge></td>
                    <td className={tblCell + " font-mono"}>{cfg.lotNumber || "—"}</td>
                    <td className={tblCell}>
                      {cfg.expiryDate ? (
                        <span className={new Date(cfg.expiryDate) < new Date() ? "text-red-600 font-semibold" : ""}>
                          {fmtDate(cfg.expiryDate)}{new Date(cfg.expiryDate) < new Date() ? " ⚠️" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className={tblCell}>{cfg.frequency}</td>
                    <td className={tblCell}>
                      <div className="flex gap-2">
                        <button onClick={() => { setForm({ testName: cfg.testName || "", resultType: cfg.resultType || RESULT_TYPES[0], lotNumber: cfg.lotNumber || "", manufacturer: cfg.manufacturer || "", expiryDate: cfg.expiryDate || "", frequency: cfg.frequency || "Daily", controls: cfg.controls?.length ? cfg.controls : [{ name: "", level: LEVEL_OPTIONS[0], expectedResult: "", notes: "" }] }); setEditingId(String(cfg.id)); }} className="px-2 py-1 rounded-lg bg-[var(--module-primary-light)] hover:brightness-[0.96] module-accent-soft-text text-xs font-semibold">Edit</button>
                        <button onClick={() => handleDelete(cfg)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC ENTRY TAB                                  */
/* ═══════════════════════════════════════════════════════════ */
const LEVEL_COLORS: Record<string, string> = {
  "High Positive":    "bg-pink-100 text-pink-800",
  "Low Positive":     "bg-slate-100 text-slate-700",
  "Positive Control": "bg-pink-100 text-pink-800",
  "Negative Control": "bg-[var(--module-primary-light)] module-accent-soft-text",
  "Negative":         "bg-[var(--module-primary-light)] module-accent-soft-text",
  "External Control": "bg-amber-100 text-amber-700",
};

function QualEntryTab() {
  const api = useMemo(() => makeKantaApi(), []);
  const [qualConfigs, setQualConfigs]           = useState<QcItem[]>([]);
  const [draftEntries, setDraftEntries]         = useState<QcItem[]>([]);
  const [openIncidents, setOpenIncidents]       = useState<QcItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [selectedDate, setSelectedDate]         = useState(todayStr());
  const [controlResults, setControlResults]     = useState<QcItem[]>([]);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [rerunForEntryId, setRerunForEntryId]   = useState("");
  const [editingId, setEditingId]               = useState<string | null>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState("");
  const [success, setSuccess]                   = useState("");
  const [confirm, setConfirm]                   = useState<ConfirmState>(closedConfirm);

  const fetchData = useCallback(async () => {
    try {
      const [configs, entries] = await Promise.all([api.getQualConfigs(), api.getQualEntries()]);
      setQualConfigs(configs);
      setDraftEntries(entries.filter((e) => !e.submitted));
      setOpenIncidents(
        entries.filter(
          (e) => e.submitted && !e.overallPass && (e.followupStatus ?? "none") === "open"
        )
      );
    } catch (e) { setError(`Error loading configurations: ${(e as Error).message}`); }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!selectedConfigId || editingId) return;
    const cfg = qualConfigs.find((c) => c.id === selectedConfigId);
    if (!cfg) return;
    setControlResults((cfg.controls || []).map((ctrl: QcItem) => ({
      controlName: ctrl.name, level: ctrl.level, expectedResult: ctrl.expectedResult, notes: ctrl.notes || "", observedResult: "",
    })));
    setCorrectiveAction("");
    setRerunForEntryId("");
  }, [selectedConfigId, qualConfigs, editingId]);

  const selectedConfig = qualConfigs.find((c) => c.id === selectedConfigId);
  const resultOptions  = selectedConfig ? selectedConfig.resultType.split(" / ").map((s: string) => s.trim()) : [];
  const getStatus = (r: QcItem) => !r.observedResult ? "pending" : r.observedResult === r.expectedResult ? "pass" : "fail";
  const allFilled  = controlResults.length > 0 && controlResults.every((r) => r.observedResult);
  const anyFail    = controlResults.some((r) => getStatus(r) === "fail");
  const overallPass = allFilled && !anyFail;

  const resetForm = () => {
    setSelectedConfigId(""); setControlResults([]); setCorrectiveAction(""); setRerunForEntryId("");
    setSelectedDate(todayStr()); setEditingId(null); setError(""); setSuccess("");
  };

  const handleSave = async (submit: boolean) => {
    setError(""); setSuccess("");
    if (!selectedConfigId || !selectedDate) { setError("Please select a test configuration and date."); return; }
    if (submit && !allFilled) { setError("Please record observed results for all controls before submitting."); return; }
    if (submit && anyFail && !correctiveAction.trim()) { setError("A corrective action description is required when any control fails."); return; }
    setIsLoading(true);
    const payload: QcItem = {
      qcConfigId: selectedConfigId,
      date: selectedDate,
      controlResults,
      overallPass: allFilled && !anyFail,
      correctiveAction: anyFail ? correctiveAction.trim() : "",
      rerunForEntryId: rerunForEntryId || "",
      submitted: submit,
    };
    try {
      await api.saveQualEntry(payload, editingId);
      setSuccess(submit ? `QC Run submitted — Overall: ${overallPass ? "PASS" : "FAIL"}` : (editingId ? "Draft updated." : "Draft saved."));
      resetForm(); fetchData();
    } catch (e) { setError(`Error: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleSubmitDraft = async (entry: QcItem) => {
    if (!entry.controlResults?.every((r: QcItem) => r.observedResult)) { setError("Cannot submit: not all control results are filled in. Edit the draft first."); return; }
    setIsLoading(true);
    try {
      await api.saveQualEntry({ ...entry, submitted: true }, String(entry.id));
      setSuccess("Draft submitted successfully."); fetchData();
    } catch (e) { setError(`Error: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const handleDelete = (entry: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Run Draft?",
      message: <>Are you sure you want to delete this draft for <strong>{entry.testName}</strong> ({entry.date})? This cannot be undone.</>,
      confirmLabel: "Delete Draft", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false })); setIsLoading(true);
        try {
          await api.deleteQualEntry(String(entry.id)); setSuccess("Draft deleted."); fetchData();
          if (editingId === String(entry.id)) resetForm();
        } catch (e) { setError(`Error: ${(e as Error).message}`); }
        finally { setIsLoading(false); }
      },
    });
  };

  return (
    <div className="space-y-6">
      {isLoading && <div className="flex items-center gap-2 module-accent-text text-sm"><LoadingBars size="sm" /> Loading…</div>}
      {error   && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-[var(--module-primary-light)] border border-slate-200 module-accent-soft-text rounded-xl text-sm">{success}</div>}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <SectionHead icon={TestTube} title={`Qualitative QC Data Entry${editingId ? " — Editing Draft" : ""}`} />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Select Test <span className="text-red-500">*</span></label>
            <select value={selectedConfigId} onChange={(e) => { setSelectedConfigId(e.target.value); if (!editingId) setControlResults([]); }} className={selectCls} required>
              <option value="">-- Choose Test --</option>
              {qualConfigs.map((cfg) => <option key={cfg.id} value={cfg.id}>{cfg.testName}</option>)}
            </select>
            {qualConfigs.length === 0 && <p className="text-xs text-amber-600 mt-1">No tests configured. Add one in Qual. Config first.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Lot Number</label>
            <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-100 font-mono font-semibold text-slate-700 text-sm min-h-[42px] flex items-center">{selectedConfig?.lotNumber || "—"}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Date <span className="text-red-500">*</span></label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Result Type</label>
            <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-100 text-slate-700 text-sm min-h-[42px] flex items-center">{selectedConfig?.resultType || "—"}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Rerun For Failed Incident
            </label>
            <select
              value={rerunForEntryId}
              onChange={(e) => setRerunForEntryId(e.target.value)}
              className={selectCls}
            >
              <option value="">None</option>
              {openIncidents
                .filter((entry) => !selectedConfigId || entry.qcConfigId === selectedConfigId)
                .map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {entry.testName} · {entry.date}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Link this run to close a previous failed incident when rerun passes.
            </p>
          </div>
        </div>

        {controlResults.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider module-accent-text mb-3 flex items-center gap-2">Record Control Results <span className="flex-1 h-px bg-[var(--module-primary)]/25 ml-2" /></h3>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Control Name", "Level", "Expected", "Observed Result", "Status"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {controlResults.map((result, idx) => {
                    const status = getStatus(result);
                    return (
                      <tr key={idx} className={status === "fail" ? "bg-red-50" : status === "pass" ? "bg-[var(--module-primary-light)]/40" : "hover:bg-slate-50"}>
                        <td className={tblCell + " font-semibold text-slate-800"}>{result.controlName}</td>
                        <td className={tblCell}><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEVEL_COLORS[result.level] || "bg-slate-100 text-slate-700"}`}>{result.level}</span></td>
                        <td className={tblCell}><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--module-primary-light)] text-[var(--module-primary-dark)]">{result.expectedResult}</span></td>
                        <td className={tblCell}>
                          <div className="flex gap-2">
                            {resultOptions.map((opt: string) => (
                              <button key={opt} type="button" onClick={() => setControlResults((prev) => prev.map((r, i) => i === idx ? { ...r, observedResult: opt } : r))}
                                className={`flex-1 px-3 py-2 rounded-xl border-2 text-sm font-bold transition ${
                                  result.observedResult === opt
                                    ? opt === result.expectedResult ? "bg-[var(--module-primary-light)] border-[var(--module-primary)] module-accent-soft-text" : "bg-red-100 border-red-500 text-red-700"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-[var(--module-primary)]/45"
                                }`}
                              >{opt}</button>
                            ))}
                          </div>
                        </td>
                        <td className={tblCell}>
                          {status === "pass"    && <StatusBadge variant="ok">Pass</StatusBadge>}
                          {status === "fail"    && <StatusBadge variant="bad">Fail</StatusBadge>}
                          {status === "pending" && <StatusBadge variant="warn">Pending</StatusBadge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {allFilled && (
              <div className={`mt-4 p-4 rounded-xl border-2 flex items-center gap-3 font-bold text-base ${overallPass ? "bg-[var(--module-primary-light)] border-[var(--module-primary)] module-accent-soft-text" : "bg-red-50 border-red-500 text-red-700"}`}>
                <span className="text-2xl">{overallPass ? "✓" : "✗"}</span>
                <div>
                  <div>Overall QC Run: <strong>{overallPass ? "PASS" : "FAIL"}</strong>{" — "}{controlResults.filter((r) => getStatus(r) === "pass").length} of {controlResults.length} controls concordant</div>
                  {!overallPass && <div className="font-normal text-sm mt-1">Corrective action is required before releasing patient results.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {anyFail && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-3 flex items-center gap-2">Corrective Action Required <span className="flex-1 h-px bg-red-200 ml-2" /></h3>
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Describe the corrective action taken…" rows={3}
              className={inputCls + " resize-y"} required={anyFail} />
          </div>
        )}

        {selectedConfigId && (
          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={() => handleSave(false)} disabled={isLoading || !selectedConfigId} className={btnSecondary}>{editingId ? "Update Draft" : "Save Draft"}</button>
            <button type="button" onClick={() => handleSave(true)}  disabled={isLoading || !selectedConfigId} className={btnPrimary}>{editingId ? "Submit Entry" : "Save & Submit"}</button>
            <button type="button" onClick={resetForm} className={btnSecondary}>Clear</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <SectionHead icon={ClipboardList} title="Draft Entries" />
        {draftEntries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No draft QC runs.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Test", "Date", "Controls", "Filled", "Operator", "Actions"].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {draftEntries.map((entry) => {
                  const controls = entry.controlResults || [];
                  const filled   = controls.filter((r: QcItem) => r.observedResult).length;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className={tblCell + " font-semibold text-slate-800"}>{entry.testName}</td>
                      <td className={tblCell}>{entry.date}</td>
                      <td className={tblCell + " text-center"}>{controls.length}</td>
                      <td className={tblCell + " text-center"}>
                        <span className={`font-semibold ${filled === controls.length ? "module-accent-text" : "text-amber-600"}`}>{filled}/{controls.length}</span>
                      </td>
                      <td className={tblCell}>{entry.enteredBy || "—"}</td>
                      <td className={tblCell}>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setEditingId(String(entry.id)); setSelectedConfigId(entry.qcConfigId); setSelectedDate(entry.date); setControlResults(entry.controlResults || []); setCorrectiveAction(entry.correctiveAction || ""); setRerunForEntryId(entry.rerunForEntryId || ""); }} className="px-2 py-1 rounded-lg bg-[var(--module-primary-light)] hover:brightness-[0.96] module-accent-soft-text text-xs font-semibold">Edit</button>
                          <button onClick={() => handleSubmitDraft(entry)} className="px-2 py-1 rounded-lg bg-[var(--module-primary)] hover:opacity-90 text-[var(--module-primary-on)] text-xs font-semibold">Submit</button>
                          <button onClick={() => handleDelete(entry)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  QUALITATIVE QC LOG TAB                                    */
/* ═══════════════════════════════════════════════════════════ */
function QualLogTab() {
  const api = useMemo(() => makeKantaApi(), []);
  const [allRuns, setAllRuns]         = useState<QcItem[]>([]);
  const [filterTest, setFilterTest]   = useState("");
  const [filterFrom, setFilterFrom]   = useState("");
  const [filterTo, setFilterTo]       = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");
  const [confirm, setConfirm]         = useState<ConfirmState>(closedConfirm);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await api.getQualEntries();
      setAllRuns(entries.filter((e) => e.submitted).sort((a: QcItem, b: QcItem) => a.date < b.date ? 1 : -1));
    } catch (e) { setError(`Error loading data: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = allRuns.filter((run) => {
    if (filterTest && run.testName !== filterTest) return false;
    if (filterFrom && run.date < filterFrom) return false;
    if (filterTo   && run.date > filterTo)   return false;
    return true;
  });

  const totalRuns  = filtered.length;
  const passedRuns = filtered.filter((r) => r.overallPass).length;
  const failedRuns = totalRuns - passedRuns;
  const passRate   = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) : "—";
  const openFollowups = filtered.filter(
    (run) => !run.overallPass && (run.followupStatus ?? "none") === "open"
  );
  const testNames  = [...new Set(allRuns.map((r) => r.testName).filter(Boolean))];

  const handleDelete = (run: QcItem) => {
    setConfirm({
      open: true, title: "Delete QC Run Record?",
      message: <>Are you sure you want to delete this QC run <strong>{run.testName}</strong> from <strong>{run.date}</strong>? This cannot be undone.</>,
      confirmLabel: "Delete", variant: "danger",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try { await api.deleteQualEntry(String(run.id)); fetchData(); }
        catch (e) { setError(`Error: ${(e as Error).message}`); }
      },
    });
  };

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const rows: (string | number | null)[][] = [
      ["Qualitative QC Log Export"], ["Generated", new Date().toLocaleDateString()],
      ["Filter: Test", filterTest || "All"], ["Filter: Date Range", filterFrom && filterTo ? `${filterFrom} to ${filterTo}` : "All"],
      [], ["Summary"], ["Total Runs", "Passed", "Failed", "Pass Rate"],
      [totalRuns, passedRuns, failedRuns, passRate !== "—" ? `${passRate}%` : "—"],
      [], ["Date", "Test Name", "Controls Run", "Passed", "Failed", "Overall Result", "Follow-up Status", "Corrective Action"],
    ];
    filtered.forEach((run) => {
      const controls = run.controlResults || [];
      const passed = controls.filter((c: QcItem) => c.observedResult === c.expectedResult).length;
      rows.push([
        run.date,
        run.testName,
        controls.length,
        passed,
        controls.length - passed,
        run.overallPass ? "PASS" : "FAIL",
        run.followupStatus || "none",
        run.correctiveAction || "—",
      ]);
    });
    downloadCSV(rows, `QualitativeQC_Log_${todayStr()}.csv`);
  };

  return (
    <div className="space-y-5">
      {isLoading && <div className="flex items-center gap-2 module-accent-text text-sm"><LoadingBars size="sm" /> Loading…</div>}
      {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: totalRuns,  border: "border-slate-100",   color: "module-accent-text" },
          { label: "Passed",     value: passedRuns, border: "border-slate-200", color: "module-accent-text" },
          { label: "Failed",     value: failedRuns, border: "border-red-100",     color: "text-red-600"     },
          { label: "Pass Rate",  value: passRate !== "—" ? `${passRate}%` : "—",
            border: "border-slate-100",
            color: passRate === "—" ? "text-slate-600" : parseFloat(passRate) >= 90 ? "module-accent-text" : parseFloat(passRate) >= 75 ? "text-amber-600" : "text-red-600" },
        ].map(({ label, value, border, color }) => (
          <div key={label} className={`bg-white ${border} border rounded-2xl p-5 text-center shadow-sm`}>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>
      {openFollowups.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Open Corrective Actions</h4>
          <div className="space-y-2">
            {openFollowups.slice(0, 5).map((run) => (
              <div key={String(run.id)} className="flex items-center justify-between text-xs bg-white border border-amber-100 rounded-lg px-3 py-2">
                <span className="font-semibold text-slate-800">{run.testName}</span>
                <span className="text-slate-600">{fmtDate(run.date)}</span>
                <span className="text-amber-700">Awaiting pass rerun</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider module-accent-text mb-3">Filter Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Test Name</label>
            <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} className={selectCls}>
              <option value="">All Tests</option>
              {testNames.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Start Date</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">End Date</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHead icon={Activity} title="QC Run History" />
          <button onClick={handleExportCSV} disabled={!filtered.length} className={btnSecondary + " disabled:opacity-40"}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            {allRuns.length === 0 ? "No qualitative QC runs recorded yet." : "No runs match the current filters."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Date", "Test", "Controls", "Pass", "Fail", "Overall", "Follow-up", "Date Entered", "Details", ""].map((h) => <th key={h} className={tblHead}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.flatMap((run) => {
                  const controls   = run.controlResults || [];
                  const passed     = controls.filter((c: QcItem) => c.observedResult === c.expectedResult).length;
                  const failed     = controls.length - passed;
                  const isExpanded = expandedRow === String(run.id);

                  const mainRow = (
                    <tr key={String(run.id)} className={`hover:bg-slate-50 ${!run.overallPass ? "border-l-4 border-l-red-400" : ""}`}>
                      <td className={tblCell}>{fmtDate(run.date)}</td>
                      <td className={tblCell + " font-semibold text-slate-800"}>{run.testName}</td>
                      <td className={tblCell + " text-center"}>{controls.length}</td>
                      <td className={tblCell + " font-bold module-accent-text text-center"}>{passed}</td>
                      <td className={tblCell + " font-bold text-center"}><span className={failed > 0 ? "text-red-600" : "text-slate-400"}>{failed}</span></td>
                      <td className={tblCell}><PassBadge pass={run.overallPass} /></td>
                      <td className={tblCell}>
                        {(run.followupStatus ?? "none") === "open" && <StatusBadge variant="warn">Open</StatusBadge>}
                        {(run.followupStatus ?? "none") === "closed" && <StatusBadge variant="ok">Closed</StatusBadge>}
                        {(run.followupStatus ?? "none") === "override" && <StatusBadge variant="warn">Override</StatusBadge>}
                        {(run.followupStatus ?? "none") === "none" && <span className="text-slate-400">—</span>}
                      </td>
                      <td className={tblCell + " text-slate-500"}>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}</td>
                      <td className={tblCell}>
                        <button onClick={() => setExpandedRow(isExpanded ? null : String(run.id))} className="module-accent-text hover:text-[var(--module-primary-dark)] text-xs font-semibold underline flex items-center gap-1">
                          {isExpanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> View</>}
                        </button>
                      </td>
                      <td className={tblCell}>
                        <button onClick={() => handleDelete(run)} className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold">Delete</button>
                      </td>
                    </tr>
                  );

                  if (!isExpanded) return [mainRow];

                  const detailRow = (
                    <tr key={`${run.id}-detail`} className="bg-slate-50">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <h4 className="font-bold module-accent-soft-text mb-3 text-sm">Control Results Detail</h4>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs module-accent-text font-bold uppercase">
                                <th className="text-left pb-2 pr-4">Control</th>
                                <th className="text-left pb-2 pr-4">Level</th>
                                <th className="text-left pb-2 pr-4">Expected</th>
                                <th className="text-left pb-2 pr-4">Observed</th>
                                <th className="text-left pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {controls.map((ctrl: QcItem, cIdx: number) => (
                                <Fragment key={cIdx}>
                                  <tr className="border-t border-slate-100">
                                    <td className="py-2 pr-4 font-medium text-slate-800">{ctrl.controlName}</td>
                                    <td className="py-2 pr-4 text-slate-500">{ctrl.level}</td>
                                    <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--module-primary-light)] module-accent-soft-text">{ctrl.expectedResult}</span></td>
                                    <td className="py-2 pr-4">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ctrl.observedResult === ctrl.expectedResult ? "bg-[var(--module-primary-light)] module-accent-soft-text" : "bg-red-100 text-red-700"}`}>{ctrl.observedResult}</span>
                                    </td>
                                    <td className="py-2">
                                      {ctrl.observedResult === ctrl.expectedResult
                                        ? <span className="module-accent-text font-bold text-xs">Concordant</span>
                                        : <span className="text-red-600 font-bold text-xs">Discordant</span>}
                                    </td>
                                  </tr>
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                          {run.correctiveAction && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                              <span className="text-xs font-bold text-red-700 uppercase">Corrective Action: </span>
                              <span className="text-sm text-red-900">{run.correctiveAction}</span>
                            </div>
                          )}
                          {(run.followupStatus ?? "none") !== "none" && (
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
                              <span className="font-semibold">Follow-up status:</span> {run.followupStatus}
                              {run.followupClosedAt && (
                                <span className="ml-2 text-slate-500">
                                  (closed {new Date(run.followupClosedAt).toLocaleString()})
                                </span>
                              )}
                              {run.rerunEntryId && (
                                <div className="mt-1 text-xs text-slate-500">
                                  Linked rerun entry: {run.rerunEntryId}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );

                  return [mainRow, detailRow];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal {...confirm} onCancel={() => setConfirm(closedConfirm)} />
    </div>
  );
}
