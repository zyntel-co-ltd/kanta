"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import { Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, Download } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────
const LAB_SECTIONS = [
  "CHEMISTRY", "HEAMATOLOGY", "MICROBIOLOGY", "SEROLOGY", "REFERRAL", "N/A",
] as const;

const TAT_OPTIONS = [30, 60, 90, 120, 180, 240, 360, 480] as const;

const ROWS_PER_PAGE = 50;

// ── Types ──────────────────────────────────────────────────────────────────
type MetaRecord = {
  id: string;
  testName: string;
  section: string;
  price: number;
  tatMinutes: number;
};

type FormData = {
  testName: string;
  section: string;
  price: string;
  tatMinutes: string;
};

// ── CSV helper ─────────────────────────────────────────────────────────────
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Toast component ────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-emerald-600",
    error:   "bg-red-500",
    info:    "bg-slate-600",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg text-sm ${colors[type]}`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Modal component ────────────────────────────────────────────────────────
function Modal({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MetaPage() {
  const [filters, setFilters] = useState({ labSection: "all", search: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<MetaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MetaRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    testName: "",
    section: "CHEMISTRY",
    price: "0",
    tatMinutes: "60",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ facility_id: DEFAULT_FACILITY_ID });
      if (filters.labSection && filters.labSection !== "all") params.append("section", filters.labSection);
      if (filters.search) params.append("search", filters.search);

      const res = await fetch(`/api/meta?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  const paginatedData = data.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleEdit = (record: MetaRecord) => {
    setEditingRecord(record);
    setFormData({
      testName: record.testName,
      section: record.section,
      price: String(record.price),
      tatMinutes: String(record.tatMinutes),
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({ testName: "", section: "CHEMISTRY", price: "0", tatMinutes: "60" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.testName.trim() || !formData.section.trim()) return;
    setIsSaving(true);
    try {
      const payload = editingRecord
        ? { section: formData.section, price: parseFloat(formData.price) || 0, tatMinutes: parseInt(formData.tatMinutes, 10) || 60 }
        : {
            facility_id: DEFAULT_FACILITY_ID,
            testName: formData.testName.trim(),
            section: formData.section,
            price: parseFloat(formData.price) || 0,
            tatMinutes: parseInt(formData.tatMinutes, 10) || 60,
          };

      const url = editingRecord ? `/api/meta/${editingRecord.id}` : "/api/meta";
      const method = editingRecord ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToast({ message: `Test ${editingRecord ? "updated" : "created"} successfully`, type: "success" });
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ message: err.error ?? `Failed to ${editingRecord ? "update" : "create"} test`, type: "error" });
      }
    } catch {
      setToast({ message: "Error saving test", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: MetaRecord) => {
    if (!window.confirm(`Delete "${record.testName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/meta/${record.id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ message: "Test deleted", type: "success" });
        fetchData();
      } else {
        setToast({ message: "Failed to delete", type: "error" });
      }
    } catch {
      setToast({ message: "Error deleting test", type: "error" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["Test Name", "Section", "Price (UGX)", "Expected TAT (min)"];
    const rows = data.map((r) => [r.testName, r.section, r.price, r.tatMinutes]);
    downloadCSV([headers, ...rows], `Meta-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const isCustomSection = !LAB_SECTIONS.includes(formData.section as (typeof LAB_SECTIONS)[number]);
  const isCustomTAT = !TAT_OPTIONS.includes(parseInt(formData.tatMinutes, 10) as (typeof TAT_OPTIONS)[number]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header / Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-xl font-bold text-slate-800 mr-2">Meta Table</h1>

          {/* Lab Section filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lab Section</label>
            <select
              value={filters.labSection}
              onChange={(e) => {
                setFilters((p) => ({ ...p, labSection: e.target.value }));
                setCurrentPage(1);
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Sections</option>
              {LAB_SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-sm">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, search: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="Search test name, section..."
                className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((p) => ({ ...p, search: "" }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 text-sm bg-emerald-600 text-white rounded-lg px-4 py-1.5 hover:bg-emerald-700 transition-colors"
            >
              <Plus size={14} /> Add Test
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <main className="p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Summary row */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>
              {isLoading ? "Loading…" : `${data.length.toLocaleString()} record${data.length !== 1 ? "s" : ""}`}
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600 w-1/2">Test Name</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Section</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">Price (UGX)</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">Expected TAT</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      {filters.search
                        ? `No tests matching "${filters.search}"`
                        : "No test metadata found. Add your first test."}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-3 font-medium text-slate-800">{row.testName}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          {row.section}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {row.price.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {row.tatMinutes} min
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-sm text-slate-500">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        title={editingRecord ? "Edit Test" : "Add New Test"}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          {/* Test Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Test Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.testName}
              onChange={(e) => !editingRecord && setFormData((p) => ({ ...p, testName: e.target.value }))}
              readOnly={!!editingRecord}
              disabled={!!editingRecord}
              placeholder="Enter test name"
              className={`w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${editingRecord ? "bg-slate-50 cursor-not-allowed text-slate-400" : ""}`}
            />
            {editingRecord && (
              <p className="text-xs text-slate-400 mt-1">
                Test name cannot be changed — it affects existing data links.
              </p>
            )}
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              value={isCustomSection ? "_custom" : formData.section}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((p) => ({ ...p, section: v === "_custom" ? "" : v }));
              }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {LAB_SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              {isCustomSection && <option value="_custom">{formData.section}</option>}
              <option value="_custom">+ Add new section…</option>
            </select>
            {isCustomSection && (
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData((p) => ({ ...p, section: e.target.value.toUpperCase() }))}
                placeholder="Enter custom section"
                className="mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Price (UGX) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              min="0"
              placeholder="0"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Expected TAT */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expected TAT <span className="text-red-500">*</span>
            </label>
            <select
              value={isCustomTAT ? "_custom" : formData.tatMinutes}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((p) => ({ ...p, tatMinutes: v === "_custom" ? "1" : v }));
              }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {TAT_OPTIONS.map((t) => (
                <option key={t} value={t}>{t} min</option>
              ))}
              <option value="_custom">+ Add custom…</option>
            </select>
            {isCustomTAT && (
              <input
                type="number"
                value={formData.tatMinutes}
                onChange={(e) => setFormData((p) => ({ ...p, tatMinutes: e.target.value }))}
                placeholder="Enter minutes"
                min="1"
                className="mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-sm text-slate-600 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                isSaving ||
                !formData.testName.trim() ||
                !formData.section.trim() ||
                parseFloat(formData.price) < 0 ||
                parseInt(formData.tatMinutes, 10) < 1
              }
              className="text-sm bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving…" : editingRecord ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
