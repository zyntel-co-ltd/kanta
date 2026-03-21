"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LeveyJenningsChart from "@/components/qc/LeveyJenningsChart";
import type { LJPoint } from "@/components/qc/LeveyJenningsChart";
import { Beaker, AlertTriangle, Upload, Plus, BarChart3, TestTube } from "lucide-react";

import { DEFAULT_FACILITY_ID } from "@/lib/constants";

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

export default function QCPage() {
  const [activeTab, setActiveTab] = useState<"quantitative" | "qualitative">("quantitative");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [qualConfigs, setQualConfigs] = useState<QualConfig[]>([]);
  const [qualEntries, setQualEntries] = useState<QualEntry[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{
    points: LJPoint[];
    mean: number;
    sd: number;
  } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [mRes, vRes, qcRes, qeRes] = await Promise.all([
        fetch(`/api/qc/materials?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/qc/violations?facility_id=${DEFAULT_FACILITY_ID}&limit=20`),
        fetch(`/api/qc/qualitative/configs?facility_id=${DEFAULT_FACILITY_ID}`),
        fetch(`/api/qc/qualitative/entries?facility_id=${DEFAULT_FACILITY_ID}&limit=30`),
      ]);
      const mData = await mRes.json();
      const vData = await vRes.json();
      const qcData = await qcRes.json();
      const qeData = await qeRes.json();
      setMaterials(mData.data ?? []);
      setViolations(vData.data ?? []);
      setQualConfigs(qcData.data ?? []);
      setQualEntries(qeData.data ?? []);
    } catch {
      setMaterials([]);
      setViolations([]);
      setQualConfigs([]);
      setQualEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedMaterial) {
      setChartData(null);
      return;
    }
    const load = async () => {
      const res = await fetch(
        `/api/qc/runs?material_id=${selectedMaterial}&limit=50`
      );
      const json = await res.json();
      setChartData(json.data ?? null);
    };
    load();
  }, [selectedMaterial]);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const res = await fetch("/api/qc/import", {
        method: "POST",
        headers: { "x-facility-id": DEFAULT_FACILITY_ID },
        body: form,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchData();
      setImportFile(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quality Control
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quantitative (L-J) and qualitative QC (HIV Rapid, Malaria RDT, etc.).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setActiveTab("quantitative")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "quantitative"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Quantitative
            </button>
            <button
              onClick={() => setActiveTab("qualitative")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "qualitative"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Qualitative
            </button>
          </div>
          {activeTab === "quantitative" && (
            <>
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 cursor-pointer">
                <Upload size={14} />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {importFile && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importing ? "Importing…" : "Upload"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {activeTab === "qualitative" && (
        <QualitativeQCTab
          configs={qualConfigs}
          entries={qualEntries}
          facilityId={DEFAULT_FACILITY_ID}
          onRefresh={fetchData}
        />
      )}

      {activeTab === "quantitative" && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QC overview */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Beaker size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">Active Materials</span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {materials.length === 0 ? (
              <p className="text-sm text-slate-500">No materials. Import from Lab-hub CSV.</p>
            ) : (
              <div className="space-y-2">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMaterial(selectedMaterial === m.id ? null : m.id)}
                    className={`w-full text-left py-2 px-3 rounded-lg flex justify-between items-center ${
                      selectedMaterial === m.id ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium">{m.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        m.pass === true
                          ? "bg-emerald-100 text-emerald-700"
                          : m.pass === false
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.pass === true ? "Pass" : m.pass === false ? "Fail" : "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Violation log */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="font-semibold text-slate-800">Violation Log</span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {violations.length === 0 ? (
              <p className="text-sm text-slate-500">No violations</p>
            ) : (
              <div className="space-y-2">
                {violations.map((v) => (
                  <div key={v.id} className="py-2 border-b border-slate-50 text-sm">
                    <span className="font-medium text-red-700">{v.rule}</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(v.detected_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* L-J chart */}
      {selectedMaterial && chartData && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">Levey-Jennings Chart</span>
          </div>
          <div className="p-6">
            <LeveyJenningsChart
              data={chartData.points}
              mean={chartData.mean}
              sd={chartData.sd}
              width={700}
              height={320}
            />
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function QualitativeQCTab({
  configs,
  entries,
  facilityId,
  onRefresh,
}: {
  configs: QualConfig[];
  entries: QualEntry[];
  facilityId: string;
  onRefresh: () => void;
}) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configForm, setConfigForm] = useState({
    test_name: "",
    result_type: "Positive / Negative",
    controls: [{ name: "", expectedResult: "" }],
  });
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [entryForm, setEntryForm] = useState({
    run_at: new Date().toISOString().slice(0, 10),
    control_results: [] as Array<{ controlName: string; expectedResult: string; observedResult: string }>,
    corrective_action: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  useEffect(() => {
    if (!selectedConfigId || !selectedConfig) {
      setEntryForm((p) => ({ ...p, control_results: [] }));
      return;
    }
    setEntryForm((p) => ({
      ...p,
      control_results: (selectedConfig.controls ?? []).map((c) => ({
        controlName: c.name,
        expectedResult: c.expectedResult,
        observedResult: "",
      })),
    }));
  }, [selectedConfigId, selectedConfig]);

  const handleSaveConfig = async () => {
    if (!configForm.test_name.trim()) return;
    const controls = configForm.controls.filter((c) => c.name.trim() && c.expectedResult);
    if (controls.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/qc/qualitative/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          test_name: configForm.test_name.trim(),
          result_type: configForm.result_type,
          controls,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowConfigForm(false);
      setConfigForm({ test_name: "", result_type: "Positive / Negative", controls: [{ name: "", expectedResult: "" }] });
      onRefresh();
    } catch {
      alert("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!selectedConfigId || !entryForm.run_at) return;
    const allFilled = entryForm.control_results.every((r) => r.observedResult);
    if (!allFilled) return;
    const overallPass = entryForm.control_results.every(
      (r) => r.observedResult === r.expectedResult
    );
    setSaving(true);
    try {
      const res = await fetch("/api/qc/qualitative/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facilityId,
          config_id: selectedConfigId,
          run_at: entryForm.run_at,
          control_results: entryForm.control_results,
          overall_pass: overallPass,
          corrective_action: entryForm.corrective_action || null,
          submitted: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSelectedConfigId("");
      setEntryForm({ run_at: new Date().toISOString().slice(0, 10), control_results: [], corrective_action: "" });
      onRefresh();
    } catch {
      alert("Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const resultOptions = selectedConfig?.result_type?.split(" / ").map((s) => s.trim()) ?? ["Positive", "Negative"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-2">
              <TestTube size={16} className="text-indigo-600" />
              Qualitative Configs
            </span>
            <button
              onClick={() => setShowConfigForm(!showConfigForm)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showConfigForm ? "Cancel" : "+ Add Config"}
            </button>
          </div>
          {showConfigForm && (
            <div className="p-4 border-b border-slate-100 space-y-3">
              <input
                type="text"
                placeholder="Test name (e.g. HIV Rapid)"
                value={configForm.test_name}
                onChange={(e) => setConfigForm((p) => ({ ...p, test_name: e.target.value }))}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={configForm.result_type}
                onChange={(e) => setConfigForm((p) => ({ ...p, result_type: e.target.value }))}
                className="rounded border border-slate-200 px-3 py-2 text-sm"
              >
                <option>Positive / Negative</option>
                <option>Reactive / Non-Reactive</option>
                <option>Detected / Not Detected</option>
                <option>Pass / Fail</option>
              </select>
              {(configForm.controls ?? []).map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Control name"
                    value={c.name}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        controls: p.controls.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x
                        ),
                      }))
                    }
                    className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                  <select
                    value={c.expectedResult}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        controls: p.controls.map((x, j) =>
                          j === i ? { ...x, expectedResult: e.target.value } : x
                        ),
                      }))
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-sm"
                  >
                    {resultOptions.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                onClick={() => {
                  const opts = configForm.result_type.split(" / ").map((s) => s.trim());
                  setConfigForm((p) => ({
                    ...p,
                    controls: [...p.controls, { name: "", expectedResult: opts[0] ?? "" }],
                  }));
                }}
                className="text-xs text-indigo-600"
              >
                + Add control
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
              >
                Save Config
              </button>
            </div>
          )}
          <div className="p-4 max-h-48 overflow-y-auto">
            {configs.length === 0 ? (
              <p className="text-sm text-slate-500">No qualitative configs. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {configs.map((c) => (
                  <div key={c.id} className="text-sm py-2 border-b border-slate-50">
                    <span className="font-medium">{c.test_name}</span>
                    <span className="text-slate-500 ml-2">({(c.controls ?? []).length} controls)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="font-semibold text-slate-800">Record Entry</span>
          </div>
          <div className="p-4 space-y-3">
            <select
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select test…</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>{c.test_name}</option>
              ))}
            </select>
            <input
              type="date"
              value={entryForm.run_at}
              onChange={(e) => setEntryForm((p) => ({ ...p, run_at: e.target.value }))}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
            {entryForm.control_results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm w-24 truncate">{r.controlName}</span>
                <span className="text-xs text-slate-500">→ {r.expectedResult}</span>
                <select
                  value={r.observedResult}
                  onChange={(e) =>
                    setEntryForm((p) => ({
                      ...p,
                      control_results: p.control_results.map((x, j) =>
                        j === i ? { ...x, observedResult: e.target.value } : x
                      ),
                    }))
                  }
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                >
                  <option value="">—</option>
                  {resultOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            <input
              type="text"
              placeholder="Corrective action (if fail)"
              value={entryForm.corrective_action}
              onChange={(e) => setEntryForm((p) => ({ ...p, corrective_action: e.target.value }))}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              onClick={handleSaveEntry}
              disabled={
                saving ||
                !selectedConfigId ||
                !entryForm.control_results.every((r) => r.observedResult)
              }
              className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
            >
              Save Entry
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <span className="font-semibold text-slate-800">Recent Entries</span>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">No qualitative entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-50 text-sm">
                  <span>
                    {(e.qualitative_qc_configs as { test_name?: string })?.test_name ?? "—"} — {e.run_at}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      e.overall_pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {e.overall_pass ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
