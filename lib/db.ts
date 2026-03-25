/**
 * Database query helpers — all server-side only.
 * These are called by API routes. They return typed data or throw.
 */

import { createAdminClient } from "./supabase";
import type {
  DashboardKpi,
  Equipment,
  ScanEvent,
  Department,
  KpiSparklines,
  AlertSeverityBreakdown,
  MaintenanceCompliance,
  AssetValuePoint,
} from "@/types";

// ─── KPI aggregates ──────────────────────────────────────────────────────────

export async function getDashboardKpi(hospitalId: string): Promise<DashboardKpi> {
  const db = createAdminClient();

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(23, 59, 59, 999);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [
    offlineRes,
    overdueRes,
    dueSoonRes,
    alertsRes,
    offlineScansTodayRes,
    offlineScansYesterdayRes,
    scannedRes,
    prevScannedRes,
    maintenanceRes,
    prevMaintenanceRes,
    totalRes,
    operationalRes,
    healthPrevRes,
    maintCompletedRes,
    maintTotalRes,
    maintOverdueRes,
  ] = await Promise.all([
    // Offline equipment (critical)
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "offline"),
    // Overdue maintenance (next_maintenance_at < now) — warning
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).lt("next_maintenance_at", now.toISOString()).not("next_maintenance_at", "is", null),
    // Maintenance due soon (next 7 days) — info
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).gte("next_maintenance_at", now.toISOString()).lte("next_maintenance_at", sevenDaysFromNow.toISOString()),
    // Critical alerts total: offline OR overdue
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).or("status.eq.offline,next_maintenance_at.lt.now()"),
    // Alerts change: offline scans today vs yesterday (proxy when no point-in-time equipment)
    db.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status_at_scan", "offline").gte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()),
    db.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status_at_scan", "offline").gte("created_at", yesterdayStart.toISOString()).lte("created_at", yesterdayEnd.toISOString()),
    // Scans this week
    db.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).gte("created_at", weekAgo.toISOString()),
    // Scans previous week
    db.from("scan_events").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    // Maintenance due (status = maintenance)
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "maintenance"),
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "maintenance").lt("updated_at", weekAgo.toISOString()),
    // Total equipment (non-retired)
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).neq("status", "retired"),
    // Operational
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "operational"),
    // Health previous period (from snapshots if available)
    db.from("equipment_snapshots").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "operational").gte("snapshot_date", twoDaysAgo.toISOString()).lte("snapshot_date", yesterdayEnd.toISOString()),
    // Maintenance compliance: total = had maintenance due (next_maintenance < now), completed = now operational, overdue = still in maintenance
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).lt("next_maintenance_at", now.toISOString()).neq("status", "retired").not("next_maintenance_at", "is", null),
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).lt("next_maintenance_at", now.toISOString()).eq("status", "operational"),
    db.from("equipment").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).lt("next_maintenance_at", now.toISOString()).eq("status", "maintenance"),
  ]);

  const total = totalRes.count ?? 0;
  const operational = operationalRes.count ?? 0;
  const healthScoreCorrected = total > 0 ? Math.round((operational / total) * 100) : 0;

  const criticalAlerts = alertsRes.count ?? 0;
  const scannedNow = scannedRes.count ?? 0;
  const scannedPrev = prevScannedRes.count ?? 1;
  const maintenanceNow = maintenanceRes.count ?? 0;
  const maintenancePrev = prevMaintenanceRes.count ?? 0;

  const maintTotal = maintTotalRes.count ?? 0;
  const maintCompleted = maintCompletedRes.count ?? 0;
  const maintOverdue = maintOverdueRes.count ?? 0;
  const maintenanceCompliancePct = maintTotal > 0 ? Math.round((maintCompleted / maintTotal) * 100) : 0;

  const snapshotOperational = healthPrevRes.count ?? 0;
  const healthPrev = snapshotOperational > 0 && total > 0 ? Math.round((snapshotOperational / total) * 100) : healthScoreCorrected;
  const healthChange = healthScoreCorrected - healthPrev;

  const severity: AlertSeverityBreakdown = {
    critical: offlineRes.count ?? 0,
    warning: overdueRes.count ?? 0,
    info: dueSoonRes.count ?? 0,
  };

  const compliance: MaintenanceCompliance = {
    completed: maintTotal > 0 ? Math.max(0, maintTotal - maintOverdue) : 0,
    total: maintTotal,
    overdue: maintOverdue,
  };

  const sparklines = await getKpiSparklines(hospitalId);

  return {
    critical_alerts: criticalAlerts,
    equipment_scanned_this_week: scannedNow,
    maintenance_due: maintTotal > 0 ? maintenanceCompliancePct : 100,
    fleet_health_score: healthScoreCorrected,
    scanned_change: scannedNow - scannedPrev,
    maintenance_change: maintenanceNow - maintenancePrev,
    health_change: healthChange,
    critical_alerts_change: (offlineScansTodayRes.count ?? 0) - (offlineScansYesterdayRes.count ?? 0),
    severity_breakdown: severity,
    maintenance_compliance: compliance,
    sparklines,
  };
}

export async function getKpiSparklines(hospitalId: string): Promise<KpiSparklines> {
  const db = createAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data } = await db
    .from("scan_events")
    .select("created_at, status_at_scan")
    .eq("hospital_id", hospitalId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const alerts: number[] = [];
  const scanned: number[] = [];
  const maintenance: number[] = [];
  const health: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const dayScans = (data ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    });

    const total = dayScans.length;
    const offline = dayScans.filter((r) => r.status_at_scan === "offline").length;
    const maint = dayScans.filter((r) => r.status_at_scan === "maintenance").length;
    const op = dayScans.filter((r) => r.status_at_scan === "operational").length;

    alerts.push(offline);
    scanned.push(total);
    maintenance.push(maint);
    health.push(total > 0 ? Math.round((op / total) * 100) : 0);
  }

  return { alerts, scanned, maintenance, health };
}

// ─── Equipment by category ───────────────────────────────────────────────────

export async function getEquipmentByCategory(hospitalId: string) {
  const db = createAdminClient();

  const { data, error } = await db
    .from("equipment")
    .select("category")
    .eq("hospital_id", hospitalId)
    .neq("status", "retired");

  if (error) throw error;

  const colors: Record<string, string> = {
    Diagnostic: "#059669",
    Surgical: "#6ee7b7",
    Monitoring: "#c7d2fe",
    "Life Support": "#d1fae5",
    Other: "#f1f5f9",
  };

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cat = row.category ?? "Other";
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: colors[name] ?? "#94a3b8",
  }));
}

// ─── Daily scan counts (last 7 days) ────────────────────────────────────────

export async function getDailyScans(hospitalId: string) {
  const db = createAdminClient();
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  const rangePromises = Array.from({ length: 7 }, (_, i) => {
    const start = new Date();
    start.setDate(start.getDate() - (6 - i));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return db
      .from("scan_events")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .then((r) => ({ day: days[start.getDay()], scans: r.count ?? 0 }));
  });

  return Promise.all(rangePromises);
}

// ─── Equipment status monthly (last 11 months) ──────────────────────────────

export async function getEquipmentStatusMonthly(hospitalId: string) {
  const db = createAdminClient();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthPromises = Array.from({ length: 11 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (10 - i));
    const monthLabel = months[d.getMonth()];
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

    return Promise.all([
      db.from("equipment_snapshots").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "operational").gte("snapshot_date", start).lte("snapshot_date", end),
      db.from("equipment_snapshots").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "maintenance").gte("snapshot_date", start).lte("snapshot_date", end),
      db.from("equipment_snapshots").select("id", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("status", "retired").gte("snapshot_date", start).lte("snapshot_date", end),
    ]).then(([opRes, maintRes, retiredRes]) => ({
      month: monthLabel,
      operational: opRes.count ?? 0,
      maintenance: maintRes.count ?? 0,
      retired: retiredRes.count ?? 0,
    }));
  });

  return Promise.all(monthPromises);
}

// ─── Asset value by period (operational vs maintenance activity) ─────────────

export async function getAssetValueByPeriod(
  hospitalId: string
): Promise<{ "7d": AssetValuePoint[]; "30d": AssetValuePoint[]; "90d": AssetValuePoint[] }> {
  const db = createAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data } = await db
    .from("scan_events")
    .select("created_at, status_at_scan")
    .eq("hospital_id", hospitalId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const points7d: AssetValuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayScans = (data ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    });
    points7d.push({
      day: dayLabels[d.getDay()],
      operational: dayScans.filter((r) => r.status_at_scan === "operational").length,
      maintenance: dayScans.filter((r) => r.status_at_scan === "maintenance").length,
    });
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
  ninetyDaysAgo.setHours(0, 0, 0, 0);
  const { data: data90 } = await db
    .from("scan_events")
    .select("created_at, status_at_scan")
    .eq("hospital_id", hospitalId)
    .gte("created_at", ninetyDaysAgo.toISOString());

  const weekLabels: string[] = [];
  const points30d: AssetValuePoint[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7 * (w + 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekScans = (data90 ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });
    weekLabels.push(`W${4 - w}`);
    points30d.push({
      day: `W${4 - w}`,
      operational: weekScans.filter((r) => r.status_at_scan === "operational").length,
      maintenance: weekScans.filter((r) => r.status_at_scan === "maintenance").length,
    });
  }

  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const points90d: AssetValuePoint[] = [];
  for (let m = 2; m >= 0; m--) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthScans = (data90 ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    points90d.push({
      day: monthLabels[d.getMonth()],
      operational: monthScans.filter((r) => r.status_at_scan === "operational").length,
      maintenance: monthScans.filter((r) => r.status_at_scan === "maintenance").length,
    });
  }

  return { "7d": points7d, "30d": points30d, "90d": points90d };
}

// ─── Inventory (derived from equipment scan recency) ──────────────────────────

export async function getInventoryFromEquipment(hospitalId: string) {
  const db = createAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: equipment } = await db
    .from("equipment")
    .select("id, last_scanned_at")
    .eq("hospital_id", hospitalId)
    .neq("status", "retired");

  const total = equipment?.length ?? 0;
  const scannedRecently = (equipment ?? []).filter((e) => e.last_scanned_at && new Date(e.last_scanned_at) >= sevenDaysAgo).length;
  const accuracy = total > 0 ? Math.round((scannedRecently / total) * 100) : 0;

  const low = (equipment ?? []).filter((e) => {
    if (!e.last_scanned_at) return true;
    const days = (Date.now() - new Date(e.last_scanned_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > 7 && days <= 14;
  }).length;
  const critical = (equipment ?? []).filter((e) => {
    if (!e.last_scanned_at) return false;
    const days = (Date.now() - new Date(e.last_scanned_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > 14;
  }).length;
  const full = total - low - critical;

  return {
    accuracy,
    restock_due_days: critical > 0 ? 3 : 7,
    breakdown: [
      { label: "Fully Stocked", value: Math.max(0, full), color: "#059669" },
      { label: "Low Supply", value: low, color: "#94a3b8" },
      { label: "Critical", value: critical, color: "#e11d48" },
    ],
  };
}

// ─── Recent scan events ──────────────────────────────────────────────────────

export async function getRecentScans(hospitalId: string, limit = 10): Promise<ScanEvent[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("scan_events")
    .select(`
      *,
      equipment (
        id, name, model, location,
        department:departments ( id, name )
      )
    `)
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ScanEvent[];
}

// ─── Departments with on-duty technicians ───────────────────────────────────

export async function getDepartmentsWithTechnicians(hospitalId: string): Promise<Department[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("departments")
    .select(`
      *,
      equipment ( id, status ),
      technicians ( id, name, avatar_initials, on_duty, shift_start )
    `)
    .eq("hospital_id", hospitalId)
    .order("name");

  if (error) throw error;
  return (data ?? []) as Department[];
}

// ─── Equipment list ──────────────────────────────────────────────────────────

export async function getEquipment(
  hospitalId: string,
  filters?: { status?: string; department_id?: string; qr_code?: string }
): Promise<Equipment[]> {
  const db = createAdminClient();

  let query = db
    .from("equipment")
    .select(`*, department:departments(id, name)`)
    .eq("hospital_id", hospitalId)
    .order("name");

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.department_id) query = query.eq("department_id", filters.department_id);
  if (filters?.qr_code) query = query.eq("qr_code", filters.qr_code);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Equipment[];
}
