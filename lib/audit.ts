/**
 * Application-level audit log (ENG-64). Rows use table_name = audit_app.
 * Never throws — failures are logged only.
 */

import { createAdminClient } from "@/lib/supabase";

export const AUDIT_APP_TABLE = "audit_app";

export type WriteAuditLogInput = {
  facilityId: string | null;
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
};

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    const db = createAdminClient();
    const recordId =
      input.entityId && isUuid(input.entityId) ? input.entityId : null;

    const { error } = await db.from("audit_log").insert({
      table_name: AUDIT_APP_TABLE,
      record_id: recordId,
      facility_id: input.facilityId,
      action: input.action,
      entity_type: input.entityType ?? null,
      old_data: input.oldValue ?? null,
      new_data: input.newValue ?? null,
      user_id: input.userId,
      actor_id: input.userId ?? undefined,
    });

    if (error) {
      console.error("[writeAuditLog]", error.message, input.action);
    }
  } catch (e) {
    console.error("[writeAuditLog]", e);
  }
}

