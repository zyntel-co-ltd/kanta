/**
 * POST /api/qc/import — Lab-hub CSV import
 * Format: qc_configs (qcName, mean, sd, level, lotNumber, expiryDate)
 *         qc_entries (qcConfigId, date, value)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const facilityId = req.headers.get("x-facility-id") ?? "00000000-0000-0000-0000-000000000001";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "file required (multipart/form-data)" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have header and at least one row" },
        { status: 400 }
      );
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const idIdx = header.findIndex((h) => h === "id");
    const configIdx = header.findIndex((h) => h === "qcname" || h === "qc_name");
    const meanIdx = header.findIndex((h) => h === "mean");
    const sdIdx = header.findIndex((h) => h === "sd");
    const configIdIdx = header.findIndex((h) => h === "qcconfigid" || h === "qc_config_id");
    const dateIdx = header.findIndex((h) => h === "date");
    const valueIdx = header.findIndex((h) => h === "value");
    const levelIdx = header.findIndex((h) => h === "level");
    const lotIdx = header.findIndex((h) => h === "lotnumber" || h === "lot_number");

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const configMap = new Map<string, string>();
    let importedConfigs = 0;
    let importedEntries = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map((c) => c.trim());
      const get = (idx: number) => (idx >= 0 ? row[idx] ?? "" : "");

      if (configIdx >= 0 && meanIdx >= 0 && sdIdx >= 0 && get(configIdx)) {
        const qcName = get(configIdx);
        const mean = parseFloat(get(meanIdx)) || 0;
        const sd = parseFloat(get(sdIdx)) || 0.1;
        const level = parseInt(get(levelIdx), 10) || 1;
        const lotNumber = get(lotIdx) || "";
        const extId = get(idIdx) || `${qcName}:${level}:${lotNumber}`;

        if (!configMap.has(extId)) {
          const { data: mat } = await db
            .from("qc_materials")
            .insert({
              facility_id: facilityId,
              name: qcName,
              lot_number: lotNumber || null,
              level,
              analyte: qcName,
              target_mean: mean,
              target_sd: sd,
            })
            .select("id")
            .single();

          if (mat?.id) {
            configMap.set(extId, mat.id);
            configMap.set(qcName, mat.id);
            importedConfigs++;
          }
        }
      }

      if (configIdIdx >= 0 && dateIdx >= 0 && valueIdx >= 0 && get(configIdIdx)) {
        const configId = get(configIdIdx);
        const dateStr = get(dateIdx);
        const value = parseFloat(get(valueIdx));

        if (!configId || !dateStr || isNaN(value)) continue;

        let materialId = configMap.get(configId);
        if (!materialId) {
          const { data: existing } = await db
            .from("qc_materials")
            .select("id")
            .eq("facility_id", facilityId)
            .or(`id.eq.${configId},name.eq.${configId}`)
            .limit(1)
            .single();
          materialId = existing?.id;
        }

        if (materialId) {
          await db.from("qc_runs").insert({
            material_id: materialId,
            facility_id: facilityId,
            value,
            run_at: dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00Z`,
          });
          importedEntries++;
        }
      }
    }

    return NextResponse.json({
      imported_configs: importedConfigs,
      imported_entries: importedEntries,
      error: null,
    });
  } catch (err) {
    console.error("[POST /api/qc/import]", err);
    return NextResponse.json(
      { error: "Failed to import QC data" },
      { status: 500 }
    );
  }
}
