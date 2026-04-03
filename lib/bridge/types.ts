/**
 * ENG-98: extensible result-source adapters (in-memory only; no disk writes).
 */

export type TestNameMapping = { lims_name: string; kanta_name: string };

/** One normalized row extracted from a source (e.g. PDF batch). */
export type ResultSourceRow = {
  testName: string;
  sectionId: string | null;
  resultTimestamp: string;
  externalRef?: string | null;
};

export type ResultSourceContext = {
  filename?: string;
  facilityId?: string;
};

/**
 * Adapters turn raw bytes into normalized rows. Implementations must not write to disk.
 */
export type ResultSourceAdapter = {
  id: string;
  label: string;
  extract(buffer: Buffer, ctx: ResultSourceContext): Promise<ResultSourceRow[]>;
};
