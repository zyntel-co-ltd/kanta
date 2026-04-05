/**
 * seed-kanta-mazra.ts
 *
 * Seeds Kanta's database with Mazra Hospital demo data.
 * Simulates the data a Kanta installation at a real hospital would accumulate:
 *   - Hospital registration + facility config
 *   - Lab equipment (with QR codes), maintenance schedules
 *   - Lab technicians and biomedical engineers
 *   - Refrigerator units (cold chain)
 *   - QC materials + 30 days of QC results
 *   - 30 days of equipment scan events
 *   - 30 days of temperature readings
 *   - TAT targets per section
 *   - LIMS connection config (pointing to Mazra Supabase)
 *   - Operational alerts
 *
 * Usage:
 *   npx tsx scripts/seed-kanta-mazra.ts
 *   npx tsx scripts/seed-kanta-mazra.ts --days 14
 *   npx tsx scripts/seed-kanta-mazra.ts --wipe   # clear Mazra data first
 *
 * Required env vars (.env or .env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MAZRA_LIMS_DB_URL   (optional — Mazra Supabase Postgres URL for lims_connections)
 */
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";
import { randomUUID } from "node:crypto";

// ── Fixed UUIDs (stable across re-seeds) ────────────────────────────────────
const HOSPITAL_ID = "11111111-1111-4111-a111-111111111111";

const DEPT_LAB_ID  = "22220001-0000-4000-a000-000000000001";
const DEPT_BMENG_ID = "22220002-0000-4000-a000-000000000002";

// Equipment IDs (matching Mazra LIMS serial numbers for bridge lookup)
const EQUIPMENT: Array<{
  id: string; serial: string; name: string; model: string; manufacturer: string;
  category: "A" | "B" | "C"; deptId: string; qr: string;
  intervalDays: number; lastMaintained: string;
}> = [
  { id: "33330001-0000-4000-a000-000000000001", serial: "eq-01", name: "SYSMEX XP-300 Haematology Analyser",     model: "XP-300",      manufacturer: "Sysmex",     category: "A", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-01", intervalDays: 30,  lastMaintained: daysAgo(18) },
  { id: "33330002-0000-4000-a000-000000000002", serial: "eq-02", name: "HUMA Star 180 Chemistry Analyser",       model: "Star 180",    manufacturer: "Human",      category: "A", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-02", intervalDays: 30,  lastMaintained: daysAgo(12) },
  { id: "33330003-0000-4000-a000-000000000003", serial: "eq-03", name: "HUMA Star 300 Chemistry Analyser (BU)",  model: "Star 300",    manufacturer: "Human",      category: "A", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-03", intervalDays: 30,  lastMaintained: daysAgo(25) },
  { id: "33330004-0000-4000-a000-000000000004", serial: "eq-04", name: "GeneXpert IV (4-module)",                model: "GX-IV",       manufacturer: "Cepheid",    category: "A", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-04", intervalDays: 90,  lastMaintained: daysAgo(45) },
  { id: "33330005-0000-4000-a000-000000000005", serial: "eq-05", name: "Binocular Microscope (Haem)",            model: "CX23",        manufacturer: "Olympus",    category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-05", intervalDays: 90,  lastMaintained: daysAgo(30) },
  { id: "33330006-0000-4000-a000-000000000006", serial: "eq-06", name: "Binocular Microscope (Micro)",           model: "CX23",        manufacturer: "Olympus",    category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-06", intervalDays: 90,  lastMaintained: daysAgo(60) },
  { id: "33330007-0000-4000-a000-000000000007", serial: "eq-07", name: "CO2 Incubator",                         model: "Galaxy 170R", manufacturer: "Eppendorf",  category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-07", intervalDays: 90,  lastMaintained: daysAgo(20) },
  { id: "33330008-0000-4000-a000-000000000008", serial: "eq-08", name: "Autoclave (50L)",                        model: "SX-700",      manufacturer: "Tomy",       category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-08", intervalDays: 30,  lastMaintained: daysAgo(8) },
  { id: "33330009-0000-4000-a000-000000000009", serial: "eq-09", name: "Centrifuge (24-slot)",                  model: "5810R",       manufacturer: "Eppendorf",  category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-09", intervalDays: 90,  lastMaintained: daysAgo(55) },
  { id: "33330010-0000-4000-a000-000000000010", serial: "eq-10", name: "Centrifuge (12-slot)",                  model: "5424",        manufacturer: "Eppendorf",  category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-10", intervalDays: 90,  lastMaintained: daysAgo(40) },
  { id: "33330011-0000-4000-a000-000000000011", serial: "eq-11", name: "Biosafety Cabinet Class II",            model: "Safe 2020",   manufacturer: "Thermo",     category: "A", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-11", intervalDays: 30,  lastMaintained: daysAgo(15) },
  { id: "33330012-0000-4000-a000-000000000012", serial: "eq-12", name: "BD FACSCount (CD4 Analyser)",           model: "FACSCount",   manufacturer: "BD",         category: "A", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-12", intervalDays: 30,  lastMaintained: daysAgo(22) },
  { id: "33330013-0000-4000-a000-000000000013", serial: "eq-13", name: "RPR Rotator",                           model: "RS12",        manufacturer: "Stuart",     category: "C", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-13", intervalDays: 180, lastMaintained: daysAgo(90) },
  { id: "33330014-0000-4000-a000-000000000014", serial: "eq-14", name: "Water Bath (37°C)",                    model: "WB-200",      manufacturer: "Memmert",    category: "C", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-14", intervalDays: 90,  lastMaintained: daysAgo(35) },
  { id: "33330015-0000-4000-a000-000000000015", serial: "eq-15", name: "Urine Analyser (strip reader)",         model: "Clinitek",    manufacturer: "Siemens",    category: "B", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-15", intervalDays: 90,  lastMaintained: daysAgo(50) },
  { id: "33330016-0000-4000-a000-000000000016", serial: "eq-16", name: "Haematocrit Centrifuge",                model: "Z300",        manufacturer: "Hermle",     category: "C", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-16", intervalDays: 180, lastMaintained: daysAgo(100) },
  { id: "33330017-0000-4000-a000-000000000017", serial: "eq-17", name: "Label Printer (barcode)",               model: "ZD420",       manufacturer: "Zebra",      category: "C", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-17", intervalDays: 180, lastMaintained: daysAgo(75) },
  { id: "33330018-0000-4000-a000-000000000018", serial: "eq-18", name: "Tube Roller Mixer",                     model: "StuartRoller",manufacturer: "Stuart",     category: "C", deptId: DEPT_LAB_ID,   qr: "MAZRA-EQ-18", intervalDays: 180, lastMaintained: daysAgo(120) },
];

// Fridges (serial numbers match Mazra LIMS fridge IDs)
const FRIDGES = [
  { id: "44440001-0000-4000-a000-000000000001", serial: "fridge-01", name: "Blood Bank Fridge",         location: "Blood Bank section",   minTemp: 2, maxTemp: 6 },
  { id: "44440002-0000-4000-a000-000000000002", serial: "fridge-02", name: "Reagent Fridge A",          location: "Chemistry / Haem",     minTemp: 2, maxTemp: 8 },
  { id: "44440003-0000-4000-a000-000000000003", serial: "fridge-03", name: "Reagent Fridge B",          location: "Serology section",     minTemp: 2, maxTemp: 8 },
  { id: "44440004-0000-4000-a000-000000000004", serial: "fridge-04", name: "Sample Storage Fridge",     location: "Microbiology section", minTemp: 4, maxTemp: 8 },
];

// QC Materials
const QC_MATERIALS = [
  { id: "55550001-0000-4000-a000-000000000001", name: "Haematology Control Level 1",      analyte: "Haemoglobin",   level: 1, mean: 12.5, sd: 0.4, units: "g/dL",      lot: "LOT-HAE-2026-01" },
  { id: "55550002-0000-4000-a000-000000000002", name: "Haematology Control Level 2",      analyte: "Haemoglobin",   level: 2, mean: 16.2, sd: 0.5, units: "g/dL",      lot: "LOT-HAE-2026-02" },
  { id: "55550003-0000-4000-a000-000000000003", name: "Chemistry Control (Glucose)",       analyte: "Glucose",       level: 1, mean: 5.5,  sd: 0.3, units: "mmol/L",    lot: "LOT-CHEM-2026-01" },
  { id: "55550004-0000-4000-a000-000000000004", name: "Chemistry Control (Creatinine)",    analyte: "Creatinine",    level: 1, mean: 88.0, sd: 5.0, units: "µmol/L",    lot: "LOT-CHEM-2026-02" },
  { id: "55550005-0000-4000-a000-000000000005", name: "Malaria QC Positive Control",       analyte: "MalariaRDT",    level: 1, mean: 1.0,  sd: 0.0, units: "qualitative",lot: "LOT-MAL-2026-01" },
  { id: "55550006-0000-4000-a000-000000000006", name: "CD4 Control",                       analyte: "CD4",           level: 1, mean: 450,  sd: 25,  units: "cells/µL",  lot: "LOT-CD4-2026-01" },
];

// TAT targets per section
const TAT_TARGETS = [
  { section: "Haematology", testName: null as string | null, targetMinutes: 30 },
  { section: "Chemistry",   testName: null,                  targetMinutes: 60 },
  { section: "Microbiology",testName: null,                  targetMinutes: 1440 },
  { section: "Serology",    testName: null,                  targetMinutes: 60 },
  { section: "Blood Bank",  testName: null,                  targetMinutes: 90 },
  // Specific overrides
  { section: "Haematology", testName: "Malaria RDT",                    targetMinutes: 15 },
  { section: "Haematology", testName: "Malaria Microscopy (thick/thin film)", targetMinutes: 45 },
  { section: "Chemistry",   testName: "Random Blood Sugar (RBS)",       targetMinutes: 20 },
  { section: "Microbiology",testName: "GeneXpert (TB)",                 targetMinutes: 120 },
  { section: "Serology",    testName: "HIV Rapid Test",                 targetMinutes: 20 },
];

// Lab staff
const TECHNICIANS = [
  { id: "66660001-0000-4000-a000-000000000001", name: "Okwi Emmanuel",    initials: "OE", role: "Senior Lab Technician",   shift: "day" },
  { id: "66660002-0000-4000-a000-000000000002", name: "Atim Grace",       initials: "AG", role: "Lab Technician",           shift: "day" },
  { id: "66660003-0000-4000-a000-000000000003", name: "Opio David",       initials: "OD", role: "Lab Technician",           shift: "day" },
  { id: "66660004-0000-4000-a000-000000000004", name: "Apio Faith",       initials: "AF", role: "Lab Technician",           shift: "night" },
  { id: "66660005-0000-4000-a000-000000000005", name: "Omara Isaac",      initials: "OI", role: "Lab Technician",           shift: "night" },
  { id: "66660006-0000-4000-a000-000000000006", name: "Musiime Robert",   initials: "MR", role: "Biomedical Engineer",      shift: "day" },
  { id: "66660007-0000-4000-a000-000000000007", name: "Nakato Sarah",     initials: "NS", role: "Lab Receptionist",         shift: "day" },
  { id: "66660008-0000-4000-a000-000000000008", name: "Otim Charles",     initials: "OC", role: "Lab Director",             shift: "day" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isoAt(daysBack: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setUTCHours(hour - 3, minute, 0, 0); // convert EAT to UTC
  return d.toISOString();
}

function parseDays(): number {
  const i = process.argv.indexOf("--days");
  if (i !== -1) { const n = parseInt(process.argv[i + 1] ?? "", 10); if (!isNaN(n)) return n; }
  return 30;
}

function shouldWipe(): boolean {
  return process.argv.includes("--wipe");
}

// Deterministic-ish number in range
function rndInRange(seed: number, lo: number, hi: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return lo + r * (hi - lo);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(Math.abs(Math.sin(seed) * 1000)) % arr.length]!;
}

// ── Wipe Mazra demo data from Kanta ─────────────────────────────────────────
async function wipe(sb: SupabaseClient<any, "public", any>) {
  console.log("Wiping existing Mazra demo data from Kanta...");
  const tables = [
    "operational_alerts","qc_violations","qc_runs","qc_results",
    "temp_breaches","temp_readings","scan_events","maintenance_schedule",
    "equipment_snapshots","equipment","technicians","refrigerator_units",
    "qc_materials","tat_targets","tat_breaches","test_requests",
    "lims_connections","facility_settings","facility_capability_profile",
    "departments","hospitals",
  ];
  for (const t of tables) {
    await (sb as unknown as { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<unknown> } } })
      .from(t).delete().eq("hospital_id", HOSPITAL_ID);
    await (sb as unknown as { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<unknown> } } })
      .from(t).delete().eq("facility_id", HOSPITAL_ID);
    await (sb as unknown as { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<unknown> } } })
      .from(t).delete().eq("id", HOSPITAL_ID);
  }
  console.log("Wipe done.\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const limsDbUrl = process.env.MAZRA_LIMS_DB_URL?.trim() ?? "";

  if (!url || !key) {
    console.error("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const days = parseDays();
  const sb = createClient(url, key) as SupabaseClient<any, "public", any>;

  if (shouldWipe()) await wipe(sb);

  console.log(`\nKanta — Mazra Hospital demo seed (${days} days)\n`);

  // ── Hospital ──────────────────────────────────────────────────────────────
  console.log("1/12  hospitals");
  await sb.from("hospitals").upsert({
    id: HOSPITAL_ID,
    name: "Mazra Hospital",
    country: "Uganda",
    city: "Kampala",
    classification: "general_hospital",
    subscription_status: "demo",
    tier: "pro",
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  // ── Departments ───────────────────────────────────────────────────────────
  console.log("2/12  departments");
  await sb.from("departments").upsert([
    { id: DEPT_LAB_ID,   facility_id: HOSPITAL_ID, name: "Laboratory" },
    { id: DEPT_BMENG_ID, facility_id: HOSPITAL_ID, name: "Biomedical Engineering" },
  ], { onConflict: "id", ignoreDuplicates: true });

  // ── Equipment ─────────────────────────────────────────────────────────────
  console.log("3/12  equipment + maintenance_schedule");
  const now = new Date().toISOString();
  for (const eq of EQUIPMENT) {
    const nextDue = new Date();
    const daysSinceLast = new Date().getTime() - new Date(eq.lastMaintained).getTime();
    const daysLeft = eq.intervalDays - Math.floor(daysSinceLast / 86400000);
    nextDue.setDate(nextDue.getDate() + Math.max(0, daysLeft));

    await sb.from("equipment").upsert({
      id: eq.id,
      hospital_id: HOSPITAL_ID,
      facility_id: HOSPITAL_ID,
      department_id: eq.deptId,
      name: eq.name,
      model: eq.model,
      serial_number: eq.serial,
      manufacturer: eq.manufacturer,
      qr_code: eq.qr,
      category: eq.category,
      status: "operational",
      location: "Main Laboratory",
      next_maintenance_at: nextDue.toISOString(),
      updated_at: now,
      created_at: now,
    }, { onConflict: "id", ignoreDuplicates: true });

    await sb.from("maintenance_schedule").upsert({
      id: randomUUID(),
      equipment_id: eq.id,
      facility_id: HOSPITAL_ID,
      interval_days: eq.intervalDays,
      last_maintained_at: eq.lastMaintained,
      next_due_at: nextDue.toISOString(),
      notes: `Category ${eq.category} — ${eq.intervalDays}-day PM schedule`,
    }, { onConflict: "equipment_id", ignoreDuplicates: true });
  }

  // Fridge units as equipment rows too (for scan_events compatibility)
  for (const f of FRIDGES) {
    await sb.from("equipment").upsert({
      id: f.id,
      hospital_id: HOSPITAL_ID,
      facility_id: HOSPITAL_ID,
      department_id: DEPT_LAB_ID,
      name: f.name,
      model: "LF-140",
      serial_number: f.serial,
      manufacturer: "Vestfrost",
      qr_code: `MAZRA-${f.serial.toUpperCase()}`,
      category: "A",
      status: "operational",
      location: f.location,
      next_maintenance_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      updated_at: now,
      created_at: now,
    }, { onConflict: "id", ignoreDuplicates: true });
  }

  // ── Refrigerator units ────────────────────────────────────────────────────
  console.log("4/12  refrigerator_units");
  for (const f of FRIDGES) {
    await sb.from("refrigerator_units").upsert({
      id: f.id,
      facility_id: HOSPITAL_ID,
      name: f.name,
      location: f.location,
      min_temp_celsius: f.minTemp,
      max_temp_celsius: f.maxTemp,
      is_active: true,
    }, { onConflict: "id", ignoreDuplicates: true });
  }

  // ── Technicians ───────────────────────────────────────────────────────────
  console.log("5/12  technicians");
  for (const t of TECHNICIANS) {
    await sb.from("technicians").upsert({
      id: t.id,
      hospital_id: HOSPITAL_ID,
      facility_id: HOSPITAL_ID,
      department_id: DEPT_LAB_ID,
      name: t.name,
      avatar_initials: t.initials,
      on_duty: t.shift === "day",
      shift_start: t.shift === "day" ? "08:00" : "20:00",
    }, { onConflict: "id", ignoreDuplicates: true });
  }

  // ── QC materials ──────────────────────────────────────────────────────────
  console.log("6/12  qc_materials");
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  for (const m of QC_MATERIALS) {
    await sb.from("qc_materials").upsert({
      id: m.id,
      facility_id: HOSPITAL_ID,
      name: m.name,
      lot_number: m.lot,
      level: m.level,
      analyte: m.analyte,
      target_mean: m.mean,
      target_sd: m.sd,
      units: m.units,
      expires_at: expiryDate.toISOString().slice(0, 10),
      is_active: true,
    }, { onConflict: "id", ignoreDuplicates: true });
  }

  // ── TAT targets ───────────────────────────────────────────────────────────
  console.log("7/12  tat_targets");
  for (const target of TAT_TARGETS) {
    await sb.from("tat_targets").insert({
      id: randomUUID(),
      facility_id: HOSPITAL_ID,
      section: target.section,
      test_name: target.testName,
      target_minutes: target.targetMinutes,
    }).then(({ error }) => {
      // Ignore unique constraint violations (already seeded)
      if (error && !error.message.includes("unique")) {
        console.warn("  tat_targets insert warn:", error.message);
      }
    });
  }

  // ── facility_settings ─────────────────────────────────────────────────────
  console.log("8/12  facility_settings + facility_capability_profile");
  await sb.from("facility_settings").upsert({
    facility_id: HOSPITAL_ID,
    pipeline_type: "postgres",
    pipeline_config: {
      description: "Direct PostgreSQL connection to Mazra LIMS",
      host: "db.mazra-supabase.supabase.co",
      port: 5432,
      database: "postgres",
      schema: "public",
    },
    telemetry_api_key: null,
  }, { onConflict: "facility_id", ignoreDuplicates: true });

  await sb.from("facility_capability_profile").upsert({
    facility_id: HOSPITAL_ID,
    lab_sections: ["Haematology", "Chemistry", "Microbiology", "Serology", "Blood Bank"],
    test_name_mappings: [],
    lab_number_retention_days: 90,
  }, { onConflict: "facility_id", ignoreDuplicates: true });

  // ── LIMS connection ───────────────────────────────────────────────────────
  console.log("9/12  lims_connections");
  const LIMS_CONN_ID = "77770001-0000-4000-a000-000000000001";
  await sb.from("lims_connections").upsert({
    id: LIMS_CONN_ID,
    facility_id: HOSPITAL_ID,
    connector_type: "postgresql",
    connection_config: limsDbUrl
      ? { url: limsDbUrl, note: "Mazra Hospital Supabase LIMS" }
      : { note: "Set MAZRA_LIMS_DB_URL env var with the Supabase Postgres URL", placeholder: true },
    query_config: {
      // Maps Mazra LIMS columns → Kanta test_requests columns
      table: "test_orders",
      id_column: "id",
      lims_external_id_source: "id",
      patient_id_source: "patient_id",
      lab_number_source: "id",
      test_name_join: {
        join_table: "test_catalog",
        join_on: "test_orders.test_id = test_catalog.id",
        test_name_column: "test_catalog.test_name",
      },
      section_join: {
        join_table: "lab_sections",
        join_on: "test_orders.section_id = lab_sections.id",
        section_column: "lab_sections.name",
      },
      requested_at_source: "ordered_at",
      priority_source: "priority",
      status_map: {
        // Mazra test_results.status → Kanta test_requests.status
        "pending":  "pending",
        "resulted": "resulted",
        "verified": "resulted",
        "cancelled":"cancelled",
      },
      result_status_join: {
        join_table: "test_results",
        join_on: "test_orders.id = test_results.order_id",
        status_column: "test_results.status",
        resulted_at_column: "test_results.resulted_at",
      },
      filter: "test_orders.ordered_at > now() - interval '7 days'",
      order_by: "test_orders.ordered_at DESC",
      limit: 500,
    },
    is_active: limsDbUrl !== "",
    last_synced_at: null,
  }, { onConflict: "id", ignoreDuplicates: true });

  // ── Historical QC results (30 days) ──────────────────────────────────────
  console.log("10/12 qc_results (30 days)");
  const qcRows = [];
  const STAFF_NAMES = TECHNICIANS.filter((t) => t.shift === "day").map((t) => t.name);
  for (let d = days; d >= 1; d--) {
    for (const mat of QC_MATERIALS) {
      for (const runHour of [8, 16]) {
        const seed = d * 10000 + QC_MATERIALS.indexOf(mat) * 100 + runHour;
        const variance = rndInRange(seed, -2.5 * mat.sd, 2.5 * mat.sd);
        const value = mat.mean + variance;
        const zScore = variance / mat.sd;
        const violations = Math.abs(zScore) > 3 ? [{ rule: "1-3s", z: zScore.toFixed(2) }]
                         : Math.abs(zScore) > 2 ? [{ rule: "1-2s", z: zScore.toFixed(2) }]
                         : [];
        qcRows.push({
          id: randomUUID(),
          material_id: mat.id,
          facility_id: HOSPITAL_ID,
          run_date: daysAgo(d),
          value: parseFloat(value.toFixed(4)),
          z_score: parseFloat(zScore.toFixed(2)),
          rule_violations: violations,
          result_type: "quantitative",
          notes: violations.length > 0 ? "Out-of-control. Investigate." : null,
          operator: pick(STAFF_NAMES, seed),
          created_at: isoAt(d, runHour, 5),
        });
      }
    }
  }
  // Batch insert QC results
  for (let i = 0; i < qcRows.length; i += 200) {
    const { error } = await sb.from("qc_results").insert(qcRows.slice(i, i + 200));
    if (error) console.warn("  qc_results batch error:", error.message);
  }
  console.log(`    inserted ${qcRows.length} QC result rows`);

  // ── Historical temperature readings (30 days, every 30 min) ──────────────
  console.log("11/12 temp_readings (30 days, 48 readings/day/fridge)");
  const tempRows = [];
  for (let d = days; d >= 1; d--) {
    for (const fridge of FRIDGES) {
      for (let h = 0; h < 48; h++) {
        const seed = d * 100000 + FRIDGES.indexOf(fridge) * 1000 + h;
        const base = fridge.minTemp + rndInRange(seed, 0, fridge.maxTemp - fridge.minTemp);
        const temp = parseFloat((base + rndInRange(seed + 1, -0.3, 0.3)).toFixed(1));
        const recordedAt = new Date();
        recordedAt.setDate(recordedAt.getDate() - d);
        recordedAt.setUTCHours(Math.floor(h / 2), (h % 2) * 30, 0, 0);
        tempRows.push({
          id: randomUUID(),
          unit_id: fridge.id,
          facility_id: HOSPITAL_ID,
          temp_celsius: temp,
          recorded_at: recordedAt.toISOString(),
        });
      }
    }
  }
  for (let i = 0; i < tempRows.length; i += 500) {
    const { error } = await sb.from("temp_readings").insert(tempRows.slice(i, i + 500));
    if (error) console.warn("  temp_readings batch error:", error.message);
  }
  console.log(`    inserted ${tempRows.length} temperature rows`);

  // ── Historical scan events (30 days, ~5 scans/day by biomedical engineer) ──
  console.log("12/12 scan_events (30 days)");
  const scanRows = [];
  const bmEng = TECHNICIANS.find((t) => t.role === "Biomedical Engineer")!;
  for (let d = days; d >= 1; d--) {
    // 3-7 scans per day
    const scanCount = 3 + Math.floor(Math.abs(Math.sin(d * 1234)) * 4);
    for (let s = 0; s < scanCount; s++) {
      const seed = d * 10000 + s;
      const eq = pick(EQUIPMENT, seed);
      const scannedAt = isoAt(d, 9 + Math.floor(Math.abs(Math.sin(seed)) * 7), Math.floor(Math.abs(Math.sin(seed + 1)) * 60));
      scanRows.push({
        id: randomUUID(),
        hospital_id: HOSPITAL_ID,
        facility_id: HOSPITAL_ID,
        equipment_id: eq.id,
        scanned_by: bmEng.name,
        status_at_scan: "operational",
        location: "Main Laboratory",
        notes: s === 0 ? "Routine daily walkround" : null,
        synced: true,
        created_at: scannedAt,
      });
    }
  }
  for (let i = 0; i < scanRows.length; i += 200) {
    const { error } = await sb.from("scan_events").insert(scanRows.slice(i, i + 200));
    if (error) console.warn("  scan_events batch error:", error.message);
  }
  console.log(`    inserted ${scanRows.length} scan event rows`);

  // ── Seed a couple of open operational alerts ──────────────────────────────
  await sb.from("operational_alerts").insert([
    {
      id: randomUUID(),
      facility_id: HOSPITAL_ID,
      alert_type: "maintenance_due",
      title: "Scheduled PM due: GeneXpert IV",
      description: "GeneXpert IV (4-module) is due for preventive maintenance. Schedule with biomedical team.",
      severity: "warning",
      source_modules: ["equipment"],
      metadata: { equipment_id: "33330004-0000-4000-a000-000000000004", overdue_days: 2 },
      created_at: isoAt(2, 9, 0),
    },
    {
      id: randomUUID(),
      facility_id: HOSPITAL_ID,
      alert_type: "qc_out_of_control",
      title: "QC Out of Control: Chemistry Level 1",
      description: "Glucose control exceeded 2SD. Review calibration and repeat before releasing patient results.",
      severity: "critical",
      source_modules: ["qc"],
      metadata: { material_id: "55550003-0000-4000-a000-000000000003" },
      created_at: isoAt(1, 8, 10),
    },
  ]);

  console.log(`\nSeed complete.\n`);
  console.log(`Hospital ID       : ${HOSPITAL_ID}`);
  console.log(`LIMS connection ID: ${LIMS_CONN_ID}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Set MAZRA_LIMS_DB_URL in .env with Mazra's Supabase Postgres URL`);
  console.log(`  2. Re-run this script (it will update lims_connections.is_active = true)`);
  console.log(`  3. Deploy supabase/functions/kanta-tick`);
  console.log(`  4. Schedule kanta-tick to run every 60 minutes via Supabase Cron`);
}

main().catch((e) => { console.error(e); process.exit(1); });
