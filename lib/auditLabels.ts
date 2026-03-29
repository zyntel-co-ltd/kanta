/** Client-safe human-readable audit action labels (ENG-64). */

export function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    "user.provisioned": "User provisioned",
    "user.role_changed": "User role changed",
    "user.deactivated": "User deactivated",
    "user.reactivated": "User reactivated",
    "user.password_reset": "User password reset",
    "lab_section.created": "Lab section created",
    "lab_section.updated": "Lab section updated",
    "lab_shift.created": "Shift created",
    "lab_shift.updated": "Shift updated",
    "lab_shift.deleted": "Shift deleted",
    "tat.targets_updated": "TAT targets updated",
    "hospital.settings_updated": "Hospital settings updated",
    "equipment.created": "Equipment created",
    "equipment.updated": "Equipment updated",
    "equipment.deleted": "Equipment deleted",
    "qc.submitted": "QC run submitted",
  };
  return map[action] ?? action.replace(/\./g, " · ");
}
