/**
 * ENG-98: register result-source adapters in one place.
 */

import type { ResultSourceAdapter } from "./types";
import { pdfMetadataAdapter } from "./adapters/pdf-metadata";

const adapters: Record<string, ResultSourceAdapter> = {
  [pdfMetadataAdapter.id]: pdfMetadataAdapter,
};

export function getResultSourceAdapter(id: string): ResultSourceAdapter | null {
  return adapters[id] ?? null;
}

export function listResultSourceAdapters(): ResultSourceAdapter[] {
  return Object.values(adapters);
}

export function registerResultSourceAdapterForTests(adapter: ResultSourceAdapter): void {
  adapters[adapter.id] = adapter;
}
