"use client";

import { useEffect, useState } from "react";
import { Bell, Search, ChevronDown, Command } from "lucide-react";

export default function TopBar() {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastUpdated = secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100">
      {/* Left */}
      <div className="flex items-center gap-3">
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

        {/* User */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-semibold text-xs shadow-md shadow-indigo-200">
              WM
            </div>
            {/* Online status ring */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">Wycliffe M.</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
          <ChevronDown size={13} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}
