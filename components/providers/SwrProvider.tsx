"use client";

import { SWRConfig } from "swr";
import { REFERENCE_SWR_OPTIONS } from "@/lib/hooks/swrReferenceConfig";

export default function SwrProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={REFERENCE_SWR_OPTIONS}>{children}</SWRConfig>;
}
