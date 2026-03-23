"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pushRecentVisit } from "@/lib/recentVisits";

/**
 * Records the current path to localStorage for "Recently visited" on the home page.
 * Renders nothing.
 */
export default function RecentVisitsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/dashboard")) {
      pushRecentVisit(pathname);
    }
  }, [pathname]);

  return null;
}
