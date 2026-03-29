/**
 * GET/PATCH /api/admin/config/tat-targets — Section-level TAT targets (ENG-85)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthContext,
  requireAdminPanel,
  requireAuth,
  requireFacilityAccess,
} from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const facilityId = new URL(req.url).searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json({ sections: [], targets: [] });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const [{ data: sections }, { data: targets }] = await Promise.all([
      db
        .from("lab_sections")
        .select("id, name, abbreviation, code, is_active")
        .eq("facility_id", facilityId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      db
        .from("tat_targets")
        .select("id, section, section_id, target_minutes")
        .eq("facility_id", facilityId)
        .is("test_name", null),
    ]);

    return NextResponse.json({
      sections: sections ?? [],
      targets: targets ?? [],
    });
  } catch (e) {
    console.error("[GET /api/admin/config/tat-targets]", e);
    return NextResponse.json({ error: "Failed to load targets" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  const targets = body.targets;

  if (!facilityId || !Array.isArray(targets)) {
    return NextResponse.json(
      { error: "facility_id and targets[] are required" },
      { status: 400 }
    );
  }

  for (const t of targets) {
    const m = Number(t?.target_minutes);
    if (!t?.section_id || !Number.isInteger(m) || m < 1) {
      return NextResponse.json(
        { error: "Each target needs section_id and a positive integer target_minutes" },
        { status: 400 }
      );
    }
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: sectionRows } = await db
      .from("lab_sections")
      .select("id, code")
      .eq("facility_id", facilityId);

    const codeById = new Map((sectionRows ?? []).map((s) => [s.id as string, s.code as string]));

    const before: Record<string, number> = {};
    const { data: existing } = await db
      .from("tat_targets")
      .select("section_id, target_minutes")
      .eq("facility_id", facilityId)
      .is("test_name", null);

    for (const e of existing ?? []) {
      if (e.section_id) before[e.section_id as string] = e.target_minutes as number;
    }

    const now = new Date().toISOString();

    for (const t of targets as { section_id: string; target_minutes: number }[]) {
      const code = codeById.get(t.section_id);
      if (!code) {
        return NextResponse.json({ error: "Invalid section_id" }, { status: 400 });
      }

      const { data: row } = await db
        .from("tat_targets")
        .select("id")
        .eq("facility_id", facilityId)
        .eq("section", code)
        .is("test_name", null)
        .maybeSingle();

      if (row?.id) {
        const { error } = await db
          .from("tat_targets")
          .update({
            target_minutes: t.target_minutes,
            section_id: t.section_id,
            updated_at: now,
          })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("tat_targets").insert({
          facility_id: facilityId,
          section: code,
          section_id: t.section_id,
          test_name: null,
          target_minutes: t.target_minutes,
          updated_at: now,
        });
        if (error) throw error;
      }
    }

    const after: Record<string, number> = {};
    for (const t of targets) {
      after[t.section_id] = t.target_minutes;
    }

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "tat.targets_updated",
      entityType: "tat_targets",
      oldValue: before,
      newValue: after,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/admin/config/tat-targets]", e);
    return NextResponse.json({ error: "Failed to save targets" }, { status: 500 });
  }
}
