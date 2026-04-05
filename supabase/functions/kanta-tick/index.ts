/**
 * kanta-tick — Supabase Edge Function
 *
 * Simulates what hospital staff actually do in Kanta for Mazra General Hospital.
 * Runs every 60 minutes via pg_cron / Supabase Cron.
 *
 * Each tick simulates:
 *  1. Biomedical engineer doing equipment scan rounds
 *  2. Lab staff logging QC results for the shift
 *  3. Cold-chain monitor appending fridge temperature readings
 *  4. Staff acknowledging overdue alerts
 *  5. Maintenance completion logging (when schedule due)
 *  6. Equipment status snapshots
 *
 * This complements the Mazra lims-tick which generates patient/LIMS data.
 * Kanta has no dependency on Mazra — it only reads from its own tables.
 *
 * Environment variables (auto-injected by Supabase runtime):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   KANTA_DEMO_FACILITY_ID   — UUID of Mazra General Hospital in Kanta
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FACILITY_ID = Deno.env.get("KANTA_DEMO_FACILITY_ID") ?? "11111111-1111-4111-a111-111111111111";

// ── Known staff names (matches seed-kanta-mazra.ts TECHNICIANS) ────────────
const STAFF = {
  bmEng:      { name: "Musiime Robert",   initials: "MR" },
  dayShift:   ["Okwi Emmanuel", "Atim Grace", "Opio David"],
  nightShift: ["Apio Faith", "Omara Isaac"],
  director:   { name: "Otim Charles", initials: "OC" },
  receptionist: { name: "Nakato Sarah" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

function isoNow(): string {
  return new Date().toISOString();
}

function minutesFromNow(n: number): string {
  return new Date(Date.now() + n * 60_000).toISOString();
}

/** EAT hour (Uganda, UTC+3) */
function eatHour(): number {
  return (new Date().getUTCHours() + 3) % 24;
}

function isDayShift(): boolean {
  const h = eatHour();
  return h >= 8 && h < 20;
}

/** Seeded pseudo-random using tick timestamp as seed. */
function seededRng(seed: string): () => number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  let s = h === 0 ? 1 : h;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// ── Load facility data ────────────────────────────────────────────────────────

interface FacilityState {
  equipment: { id: string; name: string; status: string; next_maintenance_at: string | null }[];
  fridges: { id: string; name: string; min_temp_celsius: number; max_temp_celsius: number }[];
  qcMaterials: { id: string; name: string; analyte: string; target_mean: number; target_sd: number; units: string }[];
  openAlerts: { id: string; alert_type: string; created_at: string }[];
  maintenanceDue: { id: string; equipment_id: string; next_due_at: string }[];
}

async function loadFacilityState(
  sb: ReturnType<typeof createClient>
): Promise<FacilityState> {
  const { data: eqData } = await sb
    .from("equipment")
    .select("id, name, status, next_maintenance_at")
    .eq("facility_id", FACILITY_ID);

  const { data: fridgeData } = await sb
    .from("refrigerator_units")
    .select("id, name, min_temp_celsius, max_temp_celsius")
    .eq("facility_id", FACILITY_ID)
    .eq("is_active", true);

  const { data: qcData } = await sb
    .from("qc_materials")
    .select("id, name, analyte, target_mean, target_sd, units")
    .eq("facility_id", FACILITY_ID)
    .eq("is_active", true);

  const { data: alertData } = await sb
    .from("operational_alerts")
    .select("id, alert_type, created_at")
    .eq("facility_id", FACILITY_ID)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  const { data: maintData } = await sb
    .from("maintenance_schedule")
    .select("id, equipment_id, next_due_at")
    .eq("facility_id", FACILITY_ID)
    .lte("next_due_at", new Date().toISOString());

  return {
    equipment: eqData ?? [],
    fridges: fridgeData ?? [],
    qcMaterials: qcData ?? [],
    openAlerts: alertData ?? [],
    maintenanceDue: maintData ?? [],
  };
}

// ── 1. Equipment scan round ───────────────────────────────────────────────────

async function doEquipmentScans(
  sb: ReturnType<typeof createClient>,
  state: FacilityState,
  rng: () => number
): Promise<void> {
  if (!isDayShift() && eatHour() !== 20) return; // BM eng works day shift + handover

  // Scan 2–5 random equipment items per hour
  const count = 2 + Math.floor(rng() * 4);
  const toScan = state.equipment
    .slice()
    .sort(() => rng() - 0.5)
    .slice(0, Math.min(count, state.equipment.length));

  const scanRows = toScan.map((eq) => ({
    id: uuid(),
    hospital_id: FACILITY_ID,
    facility_id: FACILITY_ID,
    equipment_id: eq.id,
    scanned_by: STAFF.bmEng.name,
    status_at_scan: eq.status ?? "operational",
    location: "Main Laboratory",
    notes: null as string | null,
    synced: true,
    created_at: isoNow(),
  }));

  if (scanRows.length > 0) {
    const { error } = await sb.from("scan_events").insert(scanRows);
    if (error) console.error("scan_events error:", error.message);
  }
}

// ── 2. Log QC results for the shift ─────────────────────────────────────────

async function doQcEntries(
  sb: ReturnType<typeof createClient>,
  state: FacilityState,
  rng: () => number
): Promise<void> {
  // Run QC at shift start: 8am and 8pm EAT
  const h = eatHour();
  if (h !== 8 && h !== 20) return;

  const staffName = isDayShift()
    ? pick(STAFF.dayShift, rng)
    : pick(STAFF.nightShift, rng);

  const today = new Date().toISOString().slice(0, 10);

  // Check if QC already entered today for this shift
  const shiftTag = h === 8 ? "day" : "night";
  const { data: existing } = await sb
    .from("qc_results")
    .select("id")
    .eq("facility_id", FACILITY_ID)
    .eq("run_date", today)
    .eq("notes", `${shiftTag}-shift`)
    .limit(1);

  if (existing && existing.length > 0) return; // already done

  const rows = state.qcMaterials.map((mat) => {
    const zVariance = (rng() - 0.5) * 4; // Gaussian-ish via uniform approx
    const value = parseFloat((mat.target_mean + zVariance * mat.target_sd).toFixed(4));
    const zScore = parseFloat(zVariance.toFixed(2));
    const violations = Math.abs(zScore) > 3
      ? [{ rule: "1-3s", z: zScore }]
      : Math.abs(zScore) > 2
        ? [{ rule: "1-2s", z: zScore }]
        : [];

    return {
      id: uuid(),
      material_id: mat.id,
      facility_id: FACILITY_ID,
      run_date: today,
      value,
      z_score: zScore,
      rule_violations: violations,
      result_type: "quantitative",
      notes: `${shiftTag}-shift`,
      operator: staffName,
      created_at: isoNow(),
    };
  });

  if (rows.length > 0) {
    const { error } = await sb.from("qc_results").insert(rows);
    if (error) console.error("qc_results error:", error.message);
  }

  // Fire alert for any violations
  for (const r of rows) {
    const mat = state.qcMaterials.find((m) => m.id === r.material_id);
    if (r.rule_violations.length > 0 && mat) {
      await sb.from("operational_alerts").insert({
        id: uuid(),
        facility_id: FACILITY_ID,
        alert_type: "qc_out_of_control",
        title: `QC Out of Control: ${mat.name}`,
        description: `${mat.analyte} control exceeded Westgard rule ${r.rule_violations[0]?.rule}. Check calibration before releasing results.`,
        severity: r.rule_violations.some((v: { rule: string }) => v.rule === "1-3s") ? "critical" : "warning",
        source_modules: ["qc"],
        metadata: { material_id: mat.id, z_score: r.z_score, rule: r.rule_violations[0]?.rule },
        created_at: isoNow(),
      });
    }
  }
}

// ── 3. Fridge temperature readings ──────────────────────────────────────────

async function doFridgeReadings(
  sb: ReturnType<typeof createClient>,
  state: FacilityState,
  rng: () => number
): Promise<void> {
  const now = isoNow();
  const rows = [];
  const breaches = [];

  for (const fridge of state.fridges) {
    // Normal temp: within fridge range with slight variance
    const midpoint = (fridge.min_temp_celsius + fridge.max_temp_celsius) / 2;
    const range = fridge.max_temp_celsius - fridge.min_temp_celsius;
    const temp = parseFloat((midpoint + (rng() - 0.5) * range * 1.3).toFixed(1));

    const isTooHot = temp > fridge.max_temp_celsius;
    const isTooCold = temp < fridge.min_temp_celsius;
    const isBreached = isTooHot || isTooCold;

    rows.push({
      id: uuid(),
      unit_id: fridge.id,
      facility_id: FACILITY_ID,
      temp_celsius: temp,
      recorded_at: now,
    });

    if (isBreached) {
      breaches.push({
        id: uuid(),
        unit_id: fridge.id,
        facility_id: FACILITY_ID,
        breach_type: isTooHot ? "too_hot" : "too_cold",
        started_at: now,
        resolved_at: null as string | null,
        max_deviation: parseFloat(Math.abs(isTooHot ? temp - fridge.max_temp_celsius : fridge.min_temp_celsius - temp).toFixed(2)),
      });

      await sb.from("operational_alerts").insert({
        id: uuid(),
        facility_id: FACILITY_ID,
        alert_type: "cold_chain_breach",
        title: `Cold chain breach: ${fridge.name}`,
        description: `Temperature ${temp}°C — ${isTooHot ? "above maximum " + fridge.max_temp_celsius : "below minimum " + fridge.min_temp_celsius}°C. Check refrigerator immediately.`,
        severity: "critical",
        source_modules: ["refrigerator"],
        metadata: { unit_id: fridge.id, temp, breach_type: isTooHot ? "too_hot" : "too_cold" },
        created_at: now,
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await sb.from("temp_readings").insert(rows);
    if (error) console.error("temp_readings error:", error.message);
  }

  if (breaches.length > 0) {
    const { error } = await sb.from("temp_breaches").insert(breaches);
    if (error) console.error("temp_breaches error:", error.message);
  }
}

// ── 4. Acknowledge overdue alerts ────────────────────────────────────────────

async function doAlertAcknowledgements(
  sb: ReturnType<typeof createClient>,
  state: FacilityState,
  rng: () => number
): Promise<void> {
  if (!isDayShift()) return; // Director/senior staff acknowledge during day

  // Acknowledge alerts older than 2 hours (realistic response time)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const dueAlerts = state.openAlerts.filter((a) => a.created_at < twoHoursAgo);

  if (dueAlerts.length === 0) return;

  // Acknowledge 1-3 alerts per hour
  const toAck = dueAlerts.slice(0, 1 + Math.floor(rng() * 3));
  const acknowledger = pick([...STAFF.dayShift, STAFF.director.name], rng);
  const ackTime = isoNow();

  for (const alert of toAck) {
    await sb
      .from("operational_alerts")
      .update({ acknowledged_at: ackTime, acknowledged_by: acknowledger })
      .eq("id", alert.id);
  }
}

// ── 5. Maintenance completion logging ────────────────────────────────────────

async function doMaintenanceCompletions(
  sb: ReturnType<typeof createClient>,
  state: FacilityState,
  rng: () => number
): Promise<void> {
  if (!isDayShift()) return;
  if (state.maintenanceDue.length === 0) return;

  // Complete 1 overdue maintenance item per tick (BM eng works through backlog)
  const schedule = state.maintenanceDue[0]!;

  const eq = state.equipment.find((e) => e.id === schedule.equipment_id);
  if (!eq) return;

  const today = new Date().toISOString().slice(0, 10);
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + 90); // default 90-day interval

  // Mark maintenance complete on the schedule
  await sb
    .from("maintenance_schedule")
    .update({
      last_maintained_at: today,
      next_due_at: nextDue.toISOString(),
      notes: "PM completed by Musiime Robert (Biomedical Engineering)",
      updated_at: isoNow(),
    })
    .eq("id", schedule.id);

  // Update equipment next_maintenance_at
  await sb
    .from("equipment")
    .update({
      next_maintenance_at: nextDue.toISOString(),
      last_scanned_at: isoNow(),
      last_scanned_by: STAFF.bmEng.name,
      updated_at: isoNow(),
    })
    .eq("id", eq.id);

  // Log a scan event for the post-maintenance check
  await sb.from("scan_events").insert({
    id: uuid(),
    hospital_id: FACILITY_ID,
    facility_id: FACILITY_ID,
    equipment_id: eq.id,
    scanned_by: STAFF.bmEng.name,
    status_at_scan: "operational",
    location: "Main Laboratory",
    notes: `Post-PM scan. Preventive maintenance completed. Next due: ${nextDue.toISOString().slice(0, 10)}`,
    synced: true,
    created_at: isoNow(),
  });

  // Resolve any maintenance_due alert for this equipment
  await sb
    .from("operational_alerts")
    .update({ acknowledged_at: isoNow(), acknowledged_by: STAFF.bmEng.name })
    .eq("facility_id", FACILITY_ID)
    .eq("alert_type", "maintenance_due")
    .is("acknowledged_at", null);

  // Fire a maintenance alert if it was significantly overdue
  const overdueDays = Math.floor(
    (Date.now() - new Date(schedule.next_due_at).getTime()) / 86400000
  );
  if (overdueDays > 7) {
    await sb.from("operational_alerts").insert({
      id: uuid(),
      facility_id: FACILITY_ID,
      alert_type: "maintenance_completed",
      title: `PM completed (overdue ${overdueDays}d): ${eq.name}`,
      description: `Preventive maintenance completed by ${STAFF.bmEng.name}. Was ${overdueDays} days overdue.`,
      severity: "info",
      source_modules: ["equipment"],
      metadata: { equipment_id: eq.id, overdue_days: overdueDays },
      acknowledged_at: isoNow(),
      acknowledged_by: STAFF.director.name,
      created_at: isoNow(),
    });
  }
}

// ── 6. Equipment snapshots (every 4 hours) ───────────────────────────────────

async function doEquipmentSnapshots(
  sb: ReturnType<typeof createClient>,
  state: FacilityState
): Promise<void> {
  const h = eatHour();
  // Snapshot at 8am, 12pm, 4pm, 8pm EAT
  if (h !== 8 && h !== 12 && h !== 16 && h !== 20) return;

  const now = isoNow();
  const snapshots = state.equipment.map((eq) => ({
    id: uuid(),
    hospital_id: FACILITY_ID,
    equipment_id: eq.id,
    status: eq.status ?? "operational",
    snapshot_date: now,
  }));

  if (snapshots.length > 0) {
    const { error } = await sb.from("equipment_snapshots").insert(snapshots);
    if (error) console.error("equipment_snapshots error:", error.message);
  }
}

// ── 7. Purge old Kanta demo data (midnight EAT) ──────────────────────────────

async function doPurge(sb: ReturnType<typeof createClient>): Promise<void> {
  if (eatHour() !== 0) return;
  const cutoff = new Date(Date.now() - 45 * 86400000).toISOString();

  // Purge old time-series data
  await sb.from("temp_readings").delete().eq("facility_id", FACILITY_ID).lt("recorded_at", cutoff);
  await sb.from("scan_events").delete().eq("facility_id", FACILITY_ID).lt("created_at", cutoff);
  await sb.from("equipment_snapshots").delete().eq("hospital_id", FACILITY_ID).lt("snapshot_date", cutoff);
  await sb.from("qc_results").delete().eq("facility_id", FACILITY_ID).lt("created_at", cutoff);
  // Keep acknowledged alerts for 45 days
  await sb.from("operational_alerts")
    .delete()
    .eq("facility_id", FACILITY_ID)
    .not("acknowledged_at", "is", null)
    .lt("acknowledged_at", cutoff);
  // Purge old test_requests synced from LIMS (they accumulate fast)
  await sb.from("test_requests").delete().eq("facility_id", FACILITY_ID).lt("created_at", cutoff);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);

  const rng = seededRng(`kanta-tick:${new Date().toISOString().slice(0, 16)}`);
  const state = await loadFacilityState(sb);

  await doEquipmentScans(sb, state, rng);
  await doQcEntries(sb, state, rng);
  await doFridgeReadings(sb, state, rng);
  await doAlertAcknowledgements(sb, state, rng);
  await doMaintenanceCompletions(sb, state, rng);
  await doEquipmentSnapshots(sb, state);
  await doPurge(sb);

  return new Response(
    JSON.stringify({
      ok: true,
      facility_id: FACILITY_ID,
      eat_hour: eatHour(),
      day_shift: isDayShift(),
      equipment_count: state.equipment.length,
      open_alerts: state.openAlerts.length,
      maintenance_due: state.maintenanceDue.length,
      timestamp: isoNow(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
