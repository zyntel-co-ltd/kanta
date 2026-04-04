/**
 * Tracks recently visited dashboard pages for the home page "Recently visited" section.
 * Uses localStorage; excludes /dashboard/home.
 */

const STORAGE_KEY = "kanta-recent-visits";
const MAX_ENTRIES = 5;

export type RecentVisit = {
  path: string;
  label: string;
  timestamp: number;
};

const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Assets Overview",
  "/dashboard/tat": "TAT",
  "/dashboard/lab-analytics": "Lab Analytics",
  "/dashboard/tests": "Tests",
  "/dashboard/numbers": "Numbers",
  "/dashboard/meta": "Meta",
  "/dashboard/revenue": "Revenue",
  "/dashboard/performance": "Performance",
  "/dashboard/qc": "Quality Management",
  "/dashboard/quality-samples": "Quality & samples",
  "/dashboard/samples": "Samples",
  "/dashboard/lrids": "LRIDS",
  "/dashboard/assets": "Asset Management",
  "/dashboard/scan": "Scan",
  "/dashboard/equipment": "Equipment",
  "/dashboard/maintenance": "Maintenance",
  "/dashboard/refrigerator": "Refrigerator",
  "/dashboard/analytics": "Analytics",
  "/dashboard/reports": "Reports",
  "/dashboard/intelligence": "AI Insights",
  "/dashboard/departments": "Departments",
  "/dashboard/admin": "Admin",
  "/dashboard/admin/hospital": "Hospital Settings",
  "/dashboard/admin/data-connections": "Data Bridge",
  "/dashboard/admin/data-bridge": "Data Bridge",
  "/dashboard/console": "Console",
  "/dashboard/console/facilities": "Console — Facilities",
  "/dashboard/settings": "Settings",
};

function getLabel(path: string): string {
  const base = (path.split("?")[0] || "").replace(/\/$/, "") || "/dashboard";
  if (path.includes("tab=patients")) return "Patient Tracking";
  if (path.includes("tab=tests")) return "Test Tracker";
  if (path.includes("tab=reception")) return "Reception";
  return PATH_LABELS[base] ?? base.split("/").pop() ?? "Dashboard";
}

export function pushRecentVisit(path: string): void {
  if (typeof window === "undefined") return;
  let clean = path.replace(/\/$/, "") || "/dashboard";
  if (clean === "/dashboard/performance") {
    clean = "/dashboard/tat?tab=patients";
  }
  if (clean === "/dashboard/home") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: RecentVisit[] = raw ? JSON.parse(raw) : [];
    const next: RecentVisit[] = [
      { path: clean, label: getLabel(clean), timestamp: Date.now() },
      ...items.filter((i) => i.path !== clean),
    ].slice(0, MAX_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getRecentVisits(): RecentVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const visits: RecentVisit[] = JSON.parse(raw);
    return visits.map((v) =>
      v.path === "/dashboard/performance"
        ? { ...v, path: "/dashboard/tat?tab=patients", label: "Patient Tracking" }
        : v
    );
  } catch {
    return [];
  }
}

export function formatTimeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`;
  return `${Math.round(diff / 604800)}w ago`;
}
