"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";

const statuses = [
  { value: "operational", label: "Operational", color: "bg-emerald-100 text-emerald-700" },
  { value: "maintenance", label: "Maintenance", color: "bg-amber-100 text-amber-700" },
  { value: "offline", label: "Offline", color: "bg-red-100 text-red-700" },
  { value: "retired", label: "Retired", color: "bg-slate-100 text-slate-600" },
] as const;

type Status = (typeof statuses)[number]["value"];

type Props = {
  value: Status;
  onChange: (status: Status) => void | Promise<void>;
  disabled?: boolean;
};

export default function EquipmentStatusSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const current = statuses.find((s) => s.value === value) ?? statuses[0];

  const handleSelect = async (status: Status) => {
    if (status === value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onChange(status);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled || saving}
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors min-w-[100px] justify-between",
          current.color,
          (disabled || saving) && "opacity-60 cursor-not-allowed",
          !disabled && !saving && "hover:ring-2 hover:ring-offset-1 hover:ring-emerald-300"
        )}
      >
        <span>{current.label}</span>
        <ChevronDown
          size={12}
          className={clsx("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[140px]">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSelect(s.value)}
              className={clsx(
                "w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors",
                s.value === value && "bg-emerald-50"
              )}
            >
              <span className="text-slate-700">{s.label}</span>
              {s.value === value && <Check size={14} className="text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
