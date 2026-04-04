"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

type Props = {
  onScan: (decodedText: string) => void;
  onError?: (err: string) => void;
  className?: string;
  mode?: "qr-only" | "qr-and-barcode";
  /** When false (default), user must click to activate the camera. Set true for auto-start. */
  autoStart?: boolean;
};

export default function QrScanner({ onScan, onError, className, mode = "qr-only", autoStart = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(autoStart);
  const [loading, setLoading] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const readerIdRef = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!active) return;
    if (!containerRef.current) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    const init = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(readerIdRef.current, {
          verbose: false,
          formatsToSupport:
            mode === "qr-and-barcode"
              ? [
                  Html5QrcodeSupportedFormats.QR_CODE,
                  Html5QrcodeSupportedFormats.CODE_128,
                  Html5QrcodeSupportedFormats.CODE_39,
                  Html5QrcodeSupportedFormats.EAN_13,
                  Html5QrcodeSupportedFormats.EAN_8,
                  Html5QrcodeSupportedFormats.UPC_A,
                  Html5QrcodeSupportedFormats.UPC_E,
                ]
              : [Html5QrcodeSupportedFormats.QR_CODE],
        });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 5, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (mounted) onScan(decodedText);
          },
          () => {}
        );
        if (mounted) {
          scannerRef.current = scanner;
          setLoading(false);
          setError(null);
        } else {
          await scanner.stop();
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Camera access failed");
          onError?.(err instanceof Error ? err.message : "Camera access failed");
          setLoading(false);
          setActive(false);
        }
      }
    };

    init();
    return () => {
      mounted = false;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [active, onScan, onError, mode]);

  if (!active) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setActive(true)}
          className="w-full max-w-md mx-auto flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors text-slate-500 hover:text-slate-700"
        >
          <Camera size={36} strokeWidth={1.5} />
          <span className="text-sm font-medium">Click to activate camera</span>
          <span className="text-xs text-slate-400">Camera will request permission when activated</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        id={readerIdRef.current}
        ref={containerRef}
        className="w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 rounded-2xl">
          <p className="text-sm text-slate-600">Starting camera...</p>
        </div>
      )}
      {error && (
        <div className="mt-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}
    </div>
  );
}
