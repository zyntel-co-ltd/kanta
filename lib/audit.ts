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

/** Row shape from `audit_log` for human-readable summaries (ENG-159). */
export type AuditLogRowSummaryInput = {
  action: string;
  entity_type: string | null;
  table_name: string;
  old_data: unknown;
  new_data: unknown;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * ENG-159: One-line description for Console / admin audit tables.
 */
export function summariseAuditAction(row: AuditLogRowSummaryInput): string {
  const nv = asRecord(row.new_data);

  switch (row.action) {
    case "user.provisioned":
      return `Provisioned ${String(nv.role ?? "user")} account`;
    case "user.role_changed":
      return `Role changed to ${String(nv.role ?? "—")}`;
    case "user.deactivated":
      return "User deactivated";
    case "user.reactivated":
      return "User reactivated";
    case "user.password_reset":
      return "Password reset issued";
    case "hospital.settings_updated":
      return "Hospital settings updated";
    case "equipment.created":
      return "Equipment created";
    case "equipment.updated":
      return "Equipment updated";
    case "qc.submitted":
      return "QC run submitted";
    case "tat.targets_updated":
      return "TAT targets updated";
    case "lab_shift.created":
      return "Lab shift created";
    case "lab_shift.updated":
      return "Lab shift updated";
    case "lab_shift.deleted":
      return "Lab shift deleted";
    case "lab_section.created":
      return "Lab section created";
    case "lab_section.updated":
      return "Lab section updated";
    case "lims.sync_complete":
      return `LIMS sync: ${String(nv.recordsUpserted ?? nv.records ?? "—")} records`;
    case "lims.sync_error":
      return `LIMS sync failed: ${String(nv.error ?? "error")}`;
    case "purge.sensitive_fields": {
      const reqN = nv.test_requests_nullified;
      const resN = nv.test_results_nullified;
      return `Nightly purge: ${String(reqN ?? 0)} test_requests, ${String(resN ?? 0)} test_results nullified`;
    }
    case "INSERT":
      return `${row.table_name}: row created`;
    case "UPDATE":
      return `${row.table_name}: row updated`;
    case "DELETE":
      return `${row.table_name}: row deleted`;
    default:
      if (row.table_name && row.table_name !== AUDIT_APP_TABLE) {
        return `${row.table_name}: ${row.action}`;
      }
      return row.action;
  }
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

