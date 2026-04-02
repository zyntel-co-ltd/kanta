"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  Building2,
  CheckCheck,
  AlertCircle,
  Info,
  X,
  Terminal,
} from "lucide-react";
import { useSyncQueue } from "@/lib/SyncQueueContext";
import { useAuth } from "@/lib/AuthContext";
import { facilityBrandingLine } from "@/lib/hospitalDisplayName";
import NLQueryBar from "@/components/ai/NLQueryBar";
import AvailableWhenOnline from "@/components/ui/AvailableWhenOnline";
import Tooltip from "@/components/ui/Tooltip";

const HOSPITAL_LOGO_URL = process.env.NEXT_PUBLIC_HOSPITAL_LOGO_URL || "";

/* ── Helpers ── */
function getFirstName(u: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  const name = u?.user_metadata?.full_name || u?.user_metadata?.name;
  if (name) return name.split(" ")[0];
  return u?.email?.split("@")[0]?.split(/[._-]/)[0] || "User";
}

function getInitials(u: {
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}) {
  const name = u?.user_metadata?.full_name || u?.user_metadata?.name;
  if (name) {
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return words[0].slice(0, 2).toUpperCase();
  }
  const part = (u?.email || "U").split("@")[0];
  const words = part.split(/[._-]/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return part.slice(0, 2).toUpperCase();
}

/* ── Operational alerts (Supabase-backed) ── */
type AlertItem = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  created_at: string;
  read: boolean;
};

async function fetchAlerts(facilityId: string): Promise<{ alerts: AlertItem[]; unread_count: number }> {
  try {
    const res = await fetch(`/api/alerts?facility_id=${facilityId}&limit=20`);
    if (!res.ok) return { alerts: [], unread_count: 0 };
    const data = await res.json();
    return {
      alerts: (data.alerts ?? []).map((a: {
        id: string; title: string; description?: string;
        severity: string; created_at: string; acknowledged_at: string | null;
      }) => ({
        id: a.id,
        title: a.title,
        message: a.description ?? "",
        severity: (a.severity === "critical" ? "error" : a.severity) as "info" | "warning" | "error",
        created_at: a.created_at,
        read: !!a.acknowledged_at,
      })),
      unread_count: data.unread_count ?? 0,
    };
  } catch { return { alerts: [], unread_count: 0 }; }
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const severityIcon = {
  info: <Info size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />,
  warning: <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />,
  error: <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />,
};

export default function TopBar() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const {
    isOnline,
    pendingCount,
    failedCount,
    syncStatus,
    retryFailedSyncs,
  } = useSyncQueue();
  const { user, signOut, facilityAuth, facilityAuthLoading, avatarUrl } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDashboardHome =
    pathname === "/dashboard/home" || pathname?.replace(/\/$/, "") === "/dashboard/home";

  const alertsFacilityId = facilityAuth?.facilityId ?? null;

  /* ── Alerts panel (Supabase-backed) ── */
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadAlerts = useCallback(async (facilityId: string) => {
    const { alerts: fetched, unread_count } = await fetchAlerts(facilityId);
    setAlerts(fetched);
    setUnreadCount(unread_count);
  }, []);

  /* ── User dropdown ── */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* ── Live ticker + alert polling ── */
  useEffect(() => {
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (facilityAuthLoading || !alertsFacilityId || !isOnline) return;
    void loadAlerts(alertsFacilityId);
    const alertInterval = setInterval(() => void loadAlerts(alertsFacilityId), 60_000);
    return () => clearInterval(alertInterval);
  }, [facilityAuthLoading, alertsFacilityId, loadAlerts, isOnline]);

  /* ── Close panels on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const lastUpdated =
    secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

  const connectivityDot =
    syncStatus === "syncing"
      ? "bg-amber-400 animate-pulse"
      : isOnline
        ? "bg-emerald-500"
        : "bg-amber-500";

  const connectivityLabel =
    syncStatus === "syncing"
      ? "Syncing…"
      : isOnline
        ? "Online"
        : "Offline";

  const pendingSuffix =
    pendingCount > 0 ? ` · ${pendingCount} pending` : "";

  async function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
    if (!alertsFacilityId) return;
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledge_all: true, facility_id: alertsFacilityId }),
    });
  }

  async function dismissAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setUnreadCount((n) => Math.max(0, n - 1));
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const hospitalName = facilityBrandingLine(
    facilityAuth?.hospitalName,
    facilityAuth?.groupId,
    facilityAuth?.branchName
  );
  const hospitalLogo = facilityAuth?.hospitalLogoUrl || HOSPITAL_LOGO_URL;

  return (
    <header
      className={clsx(
        "sticky top-0 z-20 flex items-center justify-between px-5 bg-white/90 backdrop-blur-sm border-b border-slate-100 shadow-sm",
        isDashboardHome ? "py-1.5 min-h-[44px]" : "py-2.5"
      )}
    >

      {/* ── Left: Hospital branding ── */}
      <div className={clsx("flex items-center", isDashboardHome ? "gap-2" : "gap-3")}>
        {hospitalLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={hospitalLogo}
            alt={hospitalName}
            className={clsx("w-auto object-contain rounded-lg", isDashboardHome ? "h-7" : "h-8")}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #065f46, #059669)" }}
          >
            <Building2 size={15} className="text-white" />
          </div>
        )}
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 leading-none">{hospitalName}</p>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-200 mx-1" />

        <span className="hidden lg:flex items-center gap-1 text-xs text-slate-400">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          Updated {lastUpdated}
        </span>
      </div>

      {/* ── Right: AI Query + connectivity + Alerts + User ── */}
      <div className="flex items-center gap-1.5">

        {/* ── NL Query ── */}
        <div className="hidden lg:block">
          <NLQueryBar facilityId={alertsFacilityId} userId={user?.id} />
        </div>

        {/* ENG-63: connectivity + sync queue */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => failedCount > 0 && void retryFailedSyncs()}
            title={
              failedCount > 0
                ? `${failedCount} failed — tap to retry`
                : pendingCount > 0
                  ? `${pendingCount} pending sync`
                  : connectivityLabel
            }
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
              isOnline && syncStatus !== "syncing" && failedCount === 0
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-900",
              failedCount > 0 && "cursor-pointer hover:bg-amber-100"
            )}
          >
            <span className={clsx("h-1.5 w-1.5 flex-shrink-0 rounded-full", connectivityDot)} />
            <span className="hidden sm:inline">
              {connectivityLabel}
              {pendingSuffix}
              {failedCount > 0 ? ` · ${failedCount} failed` : ""}
            </span>
            <span className="sm:hidden tabular-nums">
              {pendingCount > 0 ? pendingCount : failedCount > 0 ? `!${failedCount}` : ""}
            </span>
          </button>
        </div>

        {/* ── Alerts bell ── */}
        <div className="relative" ref={alertsRef}>
          <Tooltip label="View operational alerts">
          <button
            type="button"
            onClick={() => { setAlertsOpen((o) => !o); setUserMenuOpen(false); }}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white tabular-nums">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          </Tooltip>

          {/* Alerts dropdown */}
          {alertsOpen && (
            <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-[60]">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Alerts</p>
                  {unreadCount > 0 && (
                    <p className="text-xs text-slate-400">{unreadCount} unread</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <CheckCheck size={12} />
                      Mark all read
                    </button>
                  )}
                  <Tooltip label="Close alerts">
                    <button
                      onClick={() => setAlertsOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                      aria-label="Close alerts"
                    >
                      <X size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Alert list */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                {!isOnline ? (
                  <div className="p-4">
                    <AvailableWhenOnline
                      title="Alerts available when online"
                      detail="Operational alerts are fetched from the server. Reconnect to view and acknowledge them."
                    />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    No alerts
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        alert.read ? "opacity-60" : "bg-slate-50/80"
                      }`}
                    >
                      {severityIcon[alert.severity]}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{alert.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(alert.created_at)}</p>
                      </div>
                      <Tooltip label="Dismiss alert">
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-300 hover:text-slate-500 flex-shrink-0"
                          aria-label="Dismiss alert"
                        >
                          <X size={12} />
                        </button>
                      </Tooltip>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {facilityAuth?.isSuperAdmin && (
          <button
            type="button"
            onClick={() => router.push("/dashboard/console")}
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-full font-medium hover:bg-slate-700 transition-colors"
            title="Zyntel Console"
          >
            <Terminal size={12} className="shrink-0" aria-hidden />
            Console
          </button>
        )}

        {/* ── User menu ── */}
        {user && (
          <div className="relative pl-1.5 border-l border-slate-200 ml-1" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen((o) => !o); setAlertsOpen(false); }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {/* Avatar */}
              {avatarUrl?.trim() ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={getFirstName(user)}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #065f46, #059669)" }}
                >
                  {getInitials(user)}
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium text-slate-800">
                {getFirstName(user)}
              </span>
              <ChevronDown
                size={13}
                className={`text-slate-400 hidden sm:block transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 py-1">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{getFirstName(user)}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>

                <button
                  onClick={() => { setUserMenuOpen(false); router.push("/dashboard/settings"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings size={14} className="text-slate-400" />
                  Settings
                </button>

                <div className="border-t border-slate-100 mt-1" />

                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
