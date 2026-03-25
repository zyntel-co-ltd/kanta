/**
 * POST /api/auth/register-facility — Create a hospital (facility) and first facility_admin user.
 * Public endpoint; rate-limit at edge in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json(
      { error: "Registration is not available in this environment." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const facility_name = typeof body.facility_name === "string" ? body.facility_name.trim() : "";
  const country =
    typeof body.country === "string" && body.country.trim()
      ? body.country.trim()
      : "Uganda";
  const city = typeof body.city === "string" ? body.city.trim() : null;
  const admin_email = typeof body.admin_email === "string" ? body.admin_email.trim().toLowerCase() : "";
  const admin_password = typeof body.admin_password === "string" ? body.admin_password : "";
  const admin_display_name =
    typeof body.admin_display_name === "string" && body.admin_display_name.trim()
      ? body.admin_display_name.trim()
      : admin_email.split("@")[0] || "Admin";

  if (!facility_name || !admin_email || admin_password.length < 8) {
    return NextResponse.json(
      {
        error:
          "facility_name, admin_email, and admin_password (min 8 characters) are required",
      },
      { status: 400 }
    );
  }

  try {
    const db = createAdminClient();
    const authAdmin = (
      db.auth as {
        admin?: {
          createUser: (opts: {
            email: string;
            password: string;
            email_confirm?: boolean;
            user_metadata?: Record<string, unknown>;
          }) => Promise<{
            data: { user?: { id: string } };
            error: { message?: string } | null;
          }>;
        };
      }
    ).admin;

    if (!authAdmin) {
      return NextResponse.json({ error: "Auth admin not available" }, { status: 500 });
    }

    const { data: hospital, error: hErr } = await db
      .from("hospitals")
      .insert({
        name: facility_name,
        country,
        city,
        tier: "free",
      })
      .select("id")
      .single();

    if (hErr || !hospital?.id) {
      console.error("[register-facility] hospital insert", hErr);
      return NextResponse.json({ error: "Could not create facility" }, { status: 500 });
    }

    const facilityId = hospital.id as string;

    const { data: authData, error: authError } = await authAdmin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { username: admin_display_name },
    });

    if (authError || !authData.user?.id) {
      await db.from("hospitals").delete().eq("id", facilityId);
      return NextResponse.json(
        { error: authError?.message || "Could not create user" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    const { error: fuErr } = await db.from("facility_users").insert({
      facility_id: facilityId,
      user_id: userId,
      role: "facility_admin",
      is_active: true,
    });

    if (fuErr) {
      console.error("[register-facility] facility_users insert", fuErr);
      try {
        await (db.auth as { admin?: { deleteUser: (id: string) => Promise<unknown> } }).admin?.deleteUser(
          userId
        );
      } catch {
        /* ignore */
      }
      await db.from("hospitals").delete().eq("id", facilityId);
      return NextResponse.json({ error: "Could not link user to facility" }, { status: 500 });
    }

    return NextResponse.json(
      {
        facility_id: facilityId,
        user_id: userId,
        email: admin_email,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[register-facility]", e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
