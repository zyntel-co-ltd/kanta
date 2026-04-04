"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CheckCircle2, Printer, Info, ChevronDown } from "lucide-react";
import QRCode from "qrcode";
import { fetchDepartments, createEquipment, updateEquipmentDetails } from "@/lib/api";
import { departments as mockDepartments } from "@/lib/data";
import QRCodeDisplay from "./QRCodeDisplay";
import Tooltip from "@/components/ui/Tooltip";
import type { Department, Equipment } from "@/types";

import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";

const CATEGORY_INFO_TITLE =
  "Category A — High-value, QR-tracked. Category B — Sensor-monitored (fridges, incubators). Category C — Inventory only.";

const CATEGORY_LINES: { value: "A" | "B" | "C"; label: string; hint: string }[] = [
  { value: "A", label: "Category A", hint: "High-value, QR-tracked" },
  { value: "B", label: "Category B", hint: "Sensor-monitored (fridges, incubators)" },
  { value: "C", label: "Category C", hint: "Inventory only" },
];

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
  /** ENG-110: edit existing row with same layout as create */
  mode?: "create" | "edit";
  initialEquipment?: Equipment | null;
};

const inputCls =
  "w-full min-h-12 px-4 rounded-xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400";

export default function AddEquipmentModal({
  open,
  onClose,
  onSuccess,
  mode = "create",
  initialEquipment = null,
}: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    qr_code: string;
    name: string;
    category: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "" as "" | "A" | "B" | "C",
    department_id: "",
    serial_number: "",
    manufacturer: "",
    model: "",
    purchase_date: "",
    purchase_value: "",
    notes: "",
    location: "",
    next_maintenance_at: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      category: "",
      department_id: "",
      serial_number: "",
      manufacturer: "",
      model: "",
      purchase_date: "",
      purchase_value: "",
      notes: "",
      location: "",
      next_maintenance_at: "",
    });
    setError(null);
    setDetailsOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoadingDepts(true);
    setError(null);
    if (mode === "create") {
      setSuccessData(null);
      resetForm();
    }
    fetchDepartments(DEFAULT_HOSPITAL_ID)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setDepartments(res.data);
        } else {
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
  }, [open, mode, resetForm]);

  useEffect(() => {
    if (!open || mode !== "edit" || !initialEquipment) return;
    const eq = initialEquipment;
    const cat = eq.category === "A" || eq.category === "B" || eq.category === "C" ? eq.category : "C";
    setForm({
      name: eq.name ?? "",
      category: cat,
      department_id: eq.department_id ?? "",
      serial_number: eq.serial_number ?? "",
      manufacturer: (eq as Equipment & { manufacturer?: string }).manufacturer ?? "",
      model: eq.model ?? "",
      purchase_date: (eq as Equipment & { purchase_date?: string }).purchase_date?.slice(0, 10) ?? "",
      purchase_value:
        (eq as Equipment & { purchase_value?: number }).purchase_value != null
          ? String((eq as Equipment & { purchase_value?: number }).purchase_value)
          : "",
      notes: (eq as Equipment & { notes?: string }).notes ?? "",
      location: eq.location ?? "",
      next_maintenance_at: eq.next_maintenance_at ? eq.next_maintenance_at.slice(0, 10) : "",
    });
    setSuccessData(null);
    setDetailsOpen(true);
  }, [open, mode, initialEquipment]);

  const handleClose = () => {
    resetForm();
    setSuccessData(null);
    onClose();
  };

  const parsePurchaseValue = (): number | null => {
    const t = form.purchase_value.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
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
    } catch {
      setError("Could not generate QR code for printing.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.department_id || !form.category) {
      setError("Name, category, and section are required.");
      return;
    }

    setSubmitting(true);
    const purchaseVal = parsePurchaseValue();
    const optionalPayload = {
      model: form.model.trim() || undefined,
      serial_number: form.serial_number.trim() || undefined,
      location: form.location.trim() || undefined,
      next_maintenance_at: form.next_maintenance_at || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      purchase_date: form.purchase_date || undefined,
      purchase_value: purchaseVal,
      notes: form.notes.trim() || undefined,
    };

    if (mode === "edit" && initialEquipment) {
      const res = await updateEquipmentDetails(initialEquipment.id, {
        name: form.name.trim(),
        department_id: form.department_id,
        category: form.category,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        location: form.location.trim() || null,
        next_maintenance_at: form.next_maintenance_at || null,
        manufacturer: form.manufacturer.trim() || null,
        purchase_date: form.purchase_date || null,
        purchase_value: purchaseVal,
        notes: form.notes.trim() || null,
      });
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      const dept = departments.find((d) => d.id === form.department_id);
      onSuccess?.({
        id: initialEquipment.id,
        qr_code: initialEquipment.qr_code,
        name: form.name.trim(),
        model: optionalPayload.model,
        serial_number: optionalPayload.serial_number,
        category: form.category,
        location: optionalPayload.location,
        department_id: form.department_id,
        department: dept ? { id: dept.id, name: dept.name } : undefined,
        status: initialEquipment.status,
        created_at: initialEquipment.created_at,
      });
      handleClose();
      return;
    }

    const res = await createEquipment({
      name: form.name.trim(),
      hospital_id: DEFAULT_HOSPITAL_ID,
      department_id: form.department_id,
      category: form.category,
      model: optionalPayload.model,
      serial_number: optionalPayload.serial_number,
      location: optionalPayload.location,
      next_maintenance_at: optionalPayload.next_maintenance_at,
      manufacturer: optionalPayload.manufacturer,
      purchase_date: optionalPayload.purchase_date,
      purchase_value: purchaseVal,
      notes: optionalPayload.notes,
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
      category: form.category,
    });
    resetForm();
    const created: CreatedEquipment = {
      id: res.data!.id,
      qr_code: res.data!.qr_code,
      name: form.name.trim(),
      model: optionalPayload.model,
      serial_number: optionalPayload.serial_number,
      category: form.category,
      location: optionalPayload.location,
      department_id: form.department_id,
      department: dept ? { id: dept.id, name: dept.name } : undefined,
      status: "operational",
      created_at: new Date().toISOString(),
    };
    onSuccess?.(created);
  };

  if (!open) return null;

  const isCategoryA = successData?.category === "A";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[min(100vw-1.5rem,28rem)] max-h-[min(92vh,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === "edit" ? "Edit equipment" : "Add equipment"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-12 min-w-12 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {successData && mode === "create" ? (
          <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-700 text-sm">
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
              {isCategoryA ? (
                <>
                  <p className="mt-3 text-sm text-slate-600">
                    Category A — print this label and attach to the asset.
                  </p>
                  <button
                    type="button"
                    onClick={handlePrintQR}
                    className="mt-3 flex items-center justify-center gap-2 w-full min-h-12 px-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 transition-colors"
                  >
                    <Printer size={18} />
                    Print QR label
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-2 w-full min-h-12 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePrintQR}
                    className="mt-4 flex items-center justify-center gap-2 w-full min-h-12 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Printer size={18} />
                    Print QR (optional)
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-2 w-full min-h-12 px-4 rounded-xl bg-slate-700 text-white font-medium"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
            {error && (
              <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Centrifuge 5804"
                className={inputCls}
                required
                autoComplete="off"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-sm font-medium text-slate-700">Category *</label>
                <Tooltip
                  label="Equipment categories"
                  description={CATEGORY_INFO_TITLE}
                  side="top"
                >
                  <span className="inline-flex cursor-help text-slate-400">
                    <Info size={16} aria-hidden />
                  </span>
                </Tooltip>
              </div>
              <fieldset className="space-y-2">
                <legend className="sr-only">Equipment category A, B, or C</legend>
                {CATEGORY_LINES.map(({ value, label, hint }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                      form.category === value
                        ? "border-slate-800 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="equipment-category"
                      value={value}
                      checked={form.category === value}
                      onChange={() => setForm((p) => ({ ...p, category: value }))}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <span>
                      <span className="font-semibold text-slate-900">{label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Section *</label>
              <p className="text-xs text-slate-500 mb-1.5">Hospital unit or department</p>
              <select
                value={form.department_id}
                onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
                className={inputCls}
                required
                disabled={loadingDepts}
              >
                <option value="">{loadingDepts ? "Loading…" : "Select section"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setDetailsOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 min-h-12 px-4 py-3 text-left text-sm font-semibold text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
                aria-expanded={detailsOpen}
              >
                Additional details
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-slate-500 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`border-t border-slate-100 px-4 py-3 space-y-3 bg-white ${detailsOpen ? "block" : "hidden"}`}
              >
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Serial number</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))}
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))}
                    className={inputCls}
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Purchase date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm((p) => ({ ...p, purchase_date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Purchase value</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.purchase_value}
                    onChange={(e) => setForm((p) => ({ ...p, purchase_value: e.target.value }))}
                    placeholder="e.g. 1500000"
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Ward, room, shelf…"
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Next maintenance</label>
                  <input
                    type="date"
                    value={form.next_maintenance_at}
                    onChange={(e) => setForm((p) => ({ ...p, next_maintenance_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    className={`${inputCls} min-h-[5rem] py-3 resize-y`}
                    placeholder="Optional notes…"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 min-h-12 px-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-12 px-4 rounded-xl bg-slate-800 text-white font-semibold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {mode === "edit" ? "Saving…" : "Adding…"}
                  </>
                ) : mode === "edit" ? (
                  "Save changes"
                ) : (
                  "Register equipment"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
