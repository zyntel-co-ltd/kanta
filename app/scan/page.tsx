"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchEquipmentByQr } from "@/lib/api";
import { useLogScan } from "@/lib/useLogScan";
import type { Equipment } from "@/types";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

import { DEFAULT_HOSPITAL_ID } from "@/lib/constants";
const DEFAULT_SCANNED_BY = "Staff";

const statusOptions = [
  { value: "operational", label: "Operational" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline", label: "Offline" },
  { value: "retired", label: "Retired" },
] as const;

const QrScanner = dynamic(
  () => import("@/components/dashboard/QrScanner").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-72 bg-slate-900 rounded-2xl animate-pulse" /> }
);

/**
 * Standalone scanner page — optimized for mobile/PWA.
 * Add to home screen for quick QR scanning. Works offline (queues scans).
 */
export default function StandaloneScanPage() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [status, setStatus] = useState<(typeof statusOptions)[number]["value"]>("operational");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logScanFn = useLogScan();

  const handleQrDecode = useCallback(async (qrCode: string) => {
    setError(null);
    setSuccess(false);
    const res = await fetchEquipmentByQr(DEFAULT_HOSPITAL_ID, qrCode);
    if (res.error) {
      setError(res.error);
      return;
    }
    const list = res.data ?? [];
    if (list.length === 0) {
      setError("Equipment not found");
      return;
    }
    setSelectedEquipment(list[0] as Equipment);
  }, []);

  const handleSubmit = async () => {
    if (!selectedEquipment) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const result = await logScanFn({
      equipment_id: selectedEquipment.id,
      hospital_id: DEFAULT_HOSPITAL_ID,
      scanned_by: DEFAULT_SCANNED_BY,
      status_at_scan: status,
    });
    setSubmitting(false);
    if (result.success) {
      setSuccess(true);
      setSelectedEquipment(null);
      window.dispatchEvent(new CustomEvent("equipment-updated"));
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setError(result.error ?? "Failed to log scan");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
        >
          <ArrowLeft size={18} />
          Back
        </Link>
        <span className="text-sm font-semibold text-emerald-400">Kanta Scanner</span>
      </header>

      {/* Scanner or result */}
      <main className="flex-1 p-4 flex flex-col">
        {success ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-emerald-400">Scan recorded</p>
              <p className="text-sm text-slate-500 mt-1">Ready for next scan</p>
            </div>
          </div>
        ) : selectedEquipment ? (
          <div className="flex-1 flex flex-col">
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Equipment</p>
              <p className="font-semibold text-lg mt-1">{selectedEquipment.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {selectedEquipment.department?.name ?? "—"}
              </p>
            </div>

            <p className="text-sm font-medium text-slate-400 mb-2">Status</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    status === opt.value
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => setSelectedEquipment(null)}
                className="flex-1 py-3 border border-slate-700 rounded-xl text-sm font-medium"
              >
                Scan again
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-emerald-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                Record
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-center text-slate-400 text-sm mb-4">
              Point camera at equipment QR code
            </p>
            <QrScanner onScan={handleQrDecode} onError={setError} />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/20 text-red-400 text-sm">{error}</div>
        )}
      </main>
    </div>
  );
}
