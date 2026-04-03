"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import AppTabBar from "@/components/dashboard/AppTabBar";
import FloatingActionButton from "@/components/dashboard/FloatingActionButton";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";

/**
 * Standard dashboard chrome (sidebar + top bar + padded main).
 */
export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { aiPanelOpen, collapsed, setCollapsed } = useSidebarLayout();
  const showAssetManagementFab =
    pathname === "/dashboard/assets" || pathname === "/dashboard/equipment";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const set = () => setIsMobile(window.innerWidth < 640);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const pushStyle = {
    marginRight: !isMobile && aiPanelOpen ? "380px" : 0,
    transition: "margin-right 300ms ease-in-out",
  } as const;

  return (
    <>
      {!collapsed && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-[149] bg-black/30"
          onClick={() => setCollapsed(true)}
        />
      )}

      <Suspense fallback={<div className="w-[76px] flex-shrink-0" aria-hidden />}>
        <Sidebar />
      </Suspense>

      <div
        className={clsx("flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden")}
        style={pushStyle}
      >
        <TopBar />
        <AppTabBar />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ ...pushStyle, backgroundColor: "var(--surface-page, #f8fafc)" }}
        >
          {children}
        </main>
        {showAssetManagementFab && <FloatingActionButton />}
      </div>
    </>
  );
}
