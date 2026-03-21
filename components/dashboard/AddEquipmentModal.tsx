"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, Printer } from "lucide-react";
import QRCode from "qrcode";
import { fetchDepartments, createEquipment } from "@/lib/api";
import { departments as mockDepartments } from "@/lib/data";
import QRCodeDisplay from "./QRCodeDisplay";
import type { Department } from "@/types";

import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";
const CATEGORIES = ["Diagnostic", "Surgical", "Monitoring", "Life Support", "Other"] as const;

export type CreatedEquipment = {
  id: string;
  qr_code: string;
  name: string;
  model?: string;
  serial_number?: string;
  category?: string;
  location?: string;
  department_id: string;
  department?: { id: string; name: string };
  status: string;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (equipment: CreatedEquipment) => void;
};

export default function AddEquipmentModal({ open, onClose, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ qr_code: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    department_id: "",
    model: "",
    serial_number: "",
    category: "Other",
    location: "",
    next_maintenance_at: "",
  });

  useEffect(() => {
    if (open) {
      setLoadingDepts(true);
      setError(null);
      setSuccessData(null);
      fetchDepartments(DEFAULT_HOSPITAL_ID)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setDepartments(res.data);
          } else {
            // Fallback to mock data
            const mock = mockDepartments.map((d) => ({
              id: d.id,
              name: d.name,
              hospital_id: DEFAULT_HOSPITAL_ID,
              created_at: new Date().toISOString(),
            })) as Department[];
            setDepartments(mock);
          }
        })
        .catch(() => {
          const mock = mockDepartments.map((d) => ({
            id: d.id,
            name: d.name,
            hospital_id: DEFAULT_HOSPITAL_ID,
            created_at: new Date().toISOString(),
          })) as Department[];
          setDepartments(mock);
        })
        .finally(() => setLoadingDepts(false));
    }
  }, [open]);

  const resetForm = () => {
    setForm({
      name: "",
      department_id: "",
      model: "",
      serial_number: "",
      category: "Other",
      location: "",
      next_maintenance_at: "",
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    setSuccessData(null);
    onClose();
  };

  const handlePrintQR = async () => {
    if (!successData?.qr_code) return;
    try {
      const qrDataUrl = await QRCode.toDataURL(successData.qr_code, { width: 256, margin: 2 });
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>QR Code - ${successData.name.replace(/"/g, "&quot;")}</title></head>
            <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;padding:2rem;">
              <h2 style="margin-bottom:0.5rem;">${successData.name.replace(/</g, "&lt;")}</h2>
              <p style="margin:0 0 1rem;color:#64748b;font-family:monospace;">${successData.qr_code}</p>
              <img src="${qrDataUrl}" alt="QR Code" width="200" height="200" style="border:2px solid #e2e8f0;border-radius:8px;" />
              <p style="margin-top:1rem;font-size:0.75rem;color:#94a3b8;">Scan to track equipment · Kanta</p>
              <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      setError("Could not generate QR code for printing.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.department_id) {
      setError("Name and Department are required.");
      return;
    }
    setSubmitting(true);
    const res = await createEquipment({
      name: form.name.trim(),
      hospital_id: DEFAULT_HOSPITAL_ID,
      department_id: form.department_id,
      model: form.model.trim() || undefined,
      serial_number: form.serial_number.trim() || undefined,
      category: form.category || "Other",
      location: form.location.trim() || undefined,
      next_maintenance_at: form.next_maintenance_at || undefined,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const dept = departments.find((d) => d.id === form.department_id);
    setSuccessData({
      qr_code: res.data!.qr_code,
      name: form.name.trim(),
    });
    resetForm();
    const created: CreatedEquipment = {
      id: res.data!.id,
      qr_code: res.data!.qr_code,
      name: form.name.trim(),
      model: form.model.trim() || undefined,
      serial_number: form.serial_number.trim() || undefined,
      category: form.category,
      location: form.location.trim() || undefined,
      department_id: form.department_id,
      department: dept ? { id: dept.id, name: dept.name } : undefined,
      status: "operational",
      created_at: new Date().toISOString(),
    };
    onSuccess?.(created);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Add Equipment</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {successData ? (
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
              <CheckCircle2 size={18} />
              Equipment added successfully.
            </div>
            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                QR Code
              </p>
              <p className="font-mono text-sm font-semibold text-slate-800 mb-3">{successData.qr_code}</p>
              <div className="flex justify-center">
                <QRCodeDisplay value={successData.qr_code} size={180} className="rounded-lg border-2 border-slate-200" />
              </div>
              <button
                type="button"
                onClick={handlePrintQR}
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                <Printer size={18} />
                Print QR
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Philips Ultrasound X7"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department *</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                required
                disabled={loadingDepts}
              >
                <option value="">{loadingDepts ? "Loading..." : "Select department"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                placeholder="e.g. MV50"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Serial Number</label>
              <input
                type="text"
                value={form.serial_number}
                onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))}
                placeholder="e.g. SN-2024-001"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Ward A, Room 12"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Next Maintenance
              </label>
              <input
                type="date"
                value={form.next_maintenance_at}
                onChange={(e) => setForm((p) => ({ ...p, next_maintenance_at: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            {/* Optional future fields – placeholders */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Coming soon
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Asset value</p>
                  <p className="text-sm text-slate-400">—</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Purchase date</p>
                  <p className="text-sm text-slate-400">—</p>
                </div>
              </div>
              <div className="mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500">Photo / document upload</p>
                <p className="text-sm text-slate-400">—</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Equipment"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
