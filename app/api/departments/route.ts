/**
 * GET  /api/departments?hospital_id=xxx  — departments with on-duty technicians
 * POST /api/departments                  — create a department
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Department } from "@/types";
import { departments as mockDepts } from "@/lib/data";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<Department[]>>> {
  const hospitalId = req.nextUrl.searchParams.get("hospital_id");

  if (!hospitalId) {
    return NextResponse.json({ data: null, error: "hospital_id is required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    const mock = mockDepts.map((d) => ({
      id: d.id,
      name: d.name,
      hospital_id: hospitalId,
      created_at: new Date().toISOString(),
    }));
    return NextResponse.json({ data: mock as Department[], error: null });
  }

  try {
    const { getDepartmentsWithTechnicians } = await import("@/lib/db");
    const depts = await getDepartmentsWithTechnicians(hospitalId);
    return NextResponse.json({ data: depts, error: null });
  } catch (err) {
    console.error("[GET /api/departments]", err);
    return NextResponse.json({ data: null, error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const body = await req.json();
    const { name, hospital_id } = body;

    if (!name || !hospital_id) {
      return NextResponse.json(
        { data: null, error: "name and hospital_id are required" },
        { status: 400 }
      );
    }

    if (!supabaseConfigured) {
      return NextResponse.json({ data: { id: `mock-${Date.now()}` }, error: null }, { status: 201 });
    }

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("departments")
      .insert({ name, hospital_id })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ data: { id: data.id }, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/departments]", err);
    return NextResponse.json({ data: null, error: "Failed to create department" }, { status: 500 });
  }
}
