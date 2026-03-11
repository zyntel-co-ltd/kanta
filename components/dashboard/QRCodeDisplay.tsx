"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

type Props = {
  value: string;
  size?: number;
  className?: string;
};

export default function QRCodeDisplay({ value, size = 200, className = "" }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { width: size, margin: 2 })
      .then(setDataUrl)
      .catch((err) => setError(String(err)));
  }, [value, size]);

  if (error) return <div className="text-red-500 text-sm">Failed to generate QR</div>;
  if (!dataUrl) return <div className="bg-slate-100 animate-pulse rounded-lg" style={{ width: size, height: size }} />;
  return (
    <img
      src={dataUrl}
      alt="QR Code"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
