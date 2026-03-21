"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search, ChevronDown, Command, PanelLeft, LogOut } from "lucide-react";
import { useSyncStatus } from "@/lib/SyncStatusContext";
import { useAuth } from "@/lib/AuthContext";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";

function getInitials(email: string) {
  const part = email.split("@")[0];
  const words = part.split(/[._-]/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2);
  }
  return part.slice(0, 2).toUpperCase();
}

function getDisplayName(u: { email?: string; user_metadata?: { full_name?: string; name?: string } }) {
  const name = u?.user_metadata?.full_name || u?.user_metadata?.name;
  if (name) return name.split(" ").slice(0, 2).join(" ");
  return u?.email?.split("@")[0] || "User";
}

export default function TopBar() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const { status, pendingCount, retry } = useSyncStatus();
  const { user, signOut } = useAuth();
  const { hidden, setHidden, toggleCollapsed, collapsed } = useSidebarLayout();

  useEffect(() => {
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastUpdated = secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  const syncDotColor =
    status === "synced" ? "bg-emerald-400" :
    status === "pending" ? "bg-amber-400" : "bg-red-500";
  const syncTitle =
    status === "synced" ? "Synced" :
    status === "pending" ? `${pendingCount} pending` : "Sync failed";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100">
      {/* Left */}
      <div className="flex items-center gap-3">
        {hidden ? (
          <button
            type="button"
            onClick={() => setHidden(false)}
            title="Show sidebar"
            className="flex items-center justify-center p-2 rounded-xl text-slate-600 bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
          >
            <PanelLeft size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toggleCollapsed()}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <PanelLeft size={18} className={collapsed ? "" : "rotate-180"} />
          </button>
        )}

        <Link
          href="/dashboard/home"
          className="hidden sm:flex items-center text-sm font-bold text-slate-800 tracking-tight hover:text-indigo-600 transition-colors pr-1"
        >
          Kanta
        </Link>

        {/* Command palette-style search */}
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment, departments..."
            className="pl-9 pr-16 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-slate-400 bg-slate-100 border border-slate-200 rounded-md font-mono">
              <Command size={9} />K
            </kbd>
          </div>
        </div>

        {/* Sync status indicator */}
        <button
          onClick={() => status === "failed" && retry()}
          title={syncTitle}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            status === "synced" ? "bg-emerald-50 text-emerald-700" :
            status === "pending" ? "bg-amber-50 text-amber-700" :
            "bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${syncDotColor} ${status === "synced" ? "animate-pulse" : ""}`} />
          {status === "synced" ? "Synced" : status === "pending" ? `${pendingCount} pending` : "Sync failed"}
        </button>

        {/* Date + Live indicator */}
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span>Mar 2026</span>
          <span className="text-xs text-slate-400 font-normal">· Live</span>
          <ChevronDown size={13} className="text-slate-400" />
        </div>

        {/* Last updated ticker */}
        <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          Updated {lastUpdated}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
        </button>

        {/* User + logout */}
        {user && (
          <>
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-semibold text-xs shadow-md shadow-indigo-200">
                  {getInitials(user.email || "")}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-tight">{getDisplayName(user)}</p>
                <p className="text-xs text-slate-400 truncate max-w-[140px]">{user.email}</p>
              </div>
              <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sign out"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
