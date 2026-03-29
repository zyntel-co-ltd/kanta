"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import AppTabBar from "@/components/dashboard/AppTabBar";

/**
 * Standard dashboard chrome (sidebar + top bar + padded main), except LRIDS:
 * Option B — fullscreen display mode, no sidebar/top bar; page provides its own chrome + exit.
 */
export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLridsDisplay =
    pathname === "/dashboard/lrids" || pathname.startsWith("/dashboard/lrids/");

  if (isLridsDisplay) {
    return (
      <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-slate-950">
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Isolate sidebar column so the collapse control (-right-3.5) isn’t clipped by flex/min-width quirks; aside stays overflow-visible */}
      <div className="relative z-30 flex h-full min-h-0 flex-shrink-0 overflow-visible">
        <Suspense
          fallback={
            <aside
              className="relative flex flex-col h-screen flex-shrink-0 w-[260px] overflow-visible border-r border-slate-200 bg-white"
              style={{ borderRadius: "0 28px 28px 0" }}
              aria-hidden
            />
          }
        >
          <Sidebar />
        </Suspense>
      </div>

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <TopBar />
        <AppTabBar />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: "var(--surface-page, #f8fafc)" }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
