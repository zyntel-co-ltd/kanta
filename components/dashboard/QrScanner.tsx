"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (decodedText: string) => void;
  onError?: (err: string) => void;
  className?: string;
};

export default function QrScanner({ onScan, onError, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(containerRef.current!.id);
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
        }
      }
    };

    init();
    return () => {
      mounted = false;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [onScan, onError]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        id="qr-reader"
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
