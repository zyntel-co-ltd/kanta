/**
 * PATCH /api/me/avatar — Update current user's avatar for the active facility (ENG-106).
 * Default SVG paths: any tier. Custom HTTPS URLs: Professional+ only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError, requireAuth } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase";
import { isProfessionalOrAbove } from "@/lib/subscriptionTier";
import { isDefaultAvatarPath } from "@/lib/defaultAvatars";

function isAllowedCustomAvatarUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))
      return true;
    return false;
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const denied = requireAuth(ctx);
  if (denied) return denied;

  if (!ctx.facilityId || !ctx.user) {
    return jsonError("No active facility", 400);
  }

  let body: { avatarUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const raw = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
  if (!raw) {
    return jsonError("avatarUrl is required", 400);
  }

  const isDefault = isDefaultAvatarPath(raw);
  const isCustom = isAllowedCustomAvatarUrl(raw);

  if (!isDefault && !isCustom) {
    return jsonError(
      "Avatar must be a default path (/avatars/default-01.svg … default-16.svg) or an HTTPS/localhost URL",
      400
    );
  }

  const db = createAdminClient();

  const { data: hospital } = await db
    .from("hospitals")
    .select("tier")
    .eq("id", ctx.facilityId)
    .maybeSingle();
  const subscriptionTier =
    typeof (hospital as { tier?: string } | null)?.tier === "string"
      ? (hospital as { tier: string }).tier
      : null;

  if (isCustom && !isProfessionalOrAbove(subscriptionTier)) {
    return NextResponse.json(
      {
        error:
          "Custom photo avatars are a Pro feature — upgrade to upload your own",
        code: "avatar_pro_required",
      },
      { status: 403 }
    );
  }

  const { data: updated, error: upErr } = await db
    .from("facility_users")
    .update({
      avatar_url: raw,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", ctx.user.id)
    .eq("facility_id", ctx.facilityId)
    .select("id")
    .maybeSingle();

  if (upErr) {
    console.error("[PATCH /api/me/avatar] facility_users", upErr);
    return NextResponse.json({ error: "Failed to save avatar" }, { status: 500 });
  }
  if (!updated) {
    return jsonError("No facility membership found for this user", 404);
  }

  const authAdmin = (
    db.auth as {
      admin?: {
        getUserById: (id: string) => Promise<{ data?: { user?: { user_metadata?: Record<string, unknown> } } }>;
        updateUserById: (
          id: string,
          attrs: { user_metadata?: Record<string, unknown> }
        ) => Promise<{ error?: { message?: string } }>;
      };
    }
  ).admin;

  if (authAdmin?.getUserById && authAdmin?.updateUserById) {
    try {
      const { data: uData } = await authAdmin.getUserById(ctx.user.id);
      const prev = (uData?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const { error: metaErr } = await authAdmin.updateUserById(ctx.user.id, {
        user_metadata: { ...prev, avatar_url: raw },
      });
      if (metaErr) {
        console.error("[PATCH /api/me/avatar] auth metadata", metaErr);
      }
    } catch (e) {
      console.error("[PATCH /api/me/avatar] auth admin", e);
    }
  }

  return NextResponse.json({ ok: true, avatarUrl: raw });
}
