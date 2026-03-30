import type { SWRConfiguration } from "swr";

const FIVE_MIN_MS = 5 * 60 * 1000;

/** ENG-109: shared stale-while-revalidate for facility config, lab sections, test catalog. */
export const REFERENCE_SWR_OPTIONS: SWRConfiguration = {
  dedupingInterval: FIVE_MIN_MS,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: FIVE_MIN_MS,
  revalidateIfStale: true,
};
