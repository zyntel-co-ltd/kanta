"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

export default function AssetsSearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search equipment, departments…"
        className="pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 transition-all placeholder:text-slate-400 text-slate-800"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
