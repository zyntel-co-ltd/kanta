"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LeveyJenningsChart from "@/components/qc/LeveyJenningsChart";
import type { LJPoint } from "@/components/qc/LeveyJenningsChart";
import { Beaker, AlertTriangle, Upload, Plus, BarChart3 } from "lucide-react";

const SEED_FACILITY_ID = "00000000-0000-0000-0000-000000000001";

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
  const [materials, setMaterials] = useState<Material[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
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
      const [mRes, vRes] = await Promise.all([
        fetch(`/api/qc/materials?facility_id=${SEED_FACILITY_ID}`),
        fetch(`/api/qc/violations?facility_id=${SEED_FACILITY_ID}&limit=20`),
      ]);
      const mData = await mRes.json();
      const vData = await vRes.json();
      setMaterials(mData.data ?? []);
      setViolations(vData.data ?? []);
    } catch {
      setMaterials([]);
      setViolations([]);
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
        headers: { "x-facility-id": SEED_FACILITY_ID },
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
            QC overview, L-J chart, violation log, run entry.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

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
    </div>
  );
}
