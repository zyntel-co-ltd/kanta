/**
 * ENG-98: PDF creation date from in-memory buffer only (no disk writes).
 * Uses pdf-parse v2 `PDFParse` API (pdfjs metadata).
 */

import { PDFParse } from "pdf-parse";
import type { ResultSourceAdapter, ResultSourceRow } from "../types";

function parsePdfDate(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (m) {
    const y = m[1];
    const mo = m[2];
    const d = m[3];
    const h = m[4] ?? "00";
    const mi = m[5] ?? "00";
    const se = m[6] ?? "00";
    const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}.000Z`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export const pdfMetadataAdapter: ResultSourceAdapter = {
  id: "pdf-metadata",
  label: "PDF metadata (creation date)",
  async extract(buffer: Buffer, ctx): Promise<ResultSourceRow[]> {
    const parser = new PDFParse({ data: buffer });
    let resultTimestamp = new Date().toISOString();
    try {
      const meta = await parser.getInfo();
      const info = (meta?.info ?? {}) as Record<string, unknown>;
      const creation =
        (typeof info.CreationDate === "string" && info.CreationDate) ||
        (typeof info.ModDate === "string" && info.ModDate) ||
        "";
      resultTimestamp = parsePdfDate(creation) ?? resultTimestamp;
    } finally {
      await parser.destroy();
    }
    const base =
      (ctx.filename ?? "upload.pdf").replace(/\.[^.]+$/, "") || "result";
    return [
      {
        testName: base,
        sectionId: null,
        resultTimestamp,
        externalRef: base,
      },
    ];
  },
};
