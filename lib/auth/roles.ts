/**
 * Facility-scoped roles (see facility_role in Supabase).
 * Platform-wide super-admins are stored in `platform_admins`, not in this enum.
 */

export type FacilityRole =
  | "facility_admin"
  | "lab_manager"
  | "lab_technician"
  | "viewer";

export const FACILITY_ROLES: FacilityRole[] = [
  "facility_admin",
  "lab_manager",
  "lab_technician",
  "viewer",
];

export function isFacilityRole(value: unknown): value is FacilityRole {
  return typeof value === "string" && FACILITY_ROLES.includes(value as FacilityRole);
}

/** Normalize legacy DB strings and aliases to `FacilityRole` (admin UI + APIs). */
export function normalizeFacilityRoleInput(value: unknown): FacilityRole {
  if (typeof value !== "string") return "viewer";
  const role = value.trim().toLowerCase();
  if (role === "admin") return "facility_admin";
  if (role === "manager") return "lab_manager";
  if (role === "technician" || role === "reception") return "lab_technician";
  if (role === "viewer") return "viewer";
  if (isFacilityRole(role)) return role;
  return "viewer";
}

export type RolePermissions = {
  /** Gates /dashboard/admin. Only facility_admin + super admin. */
  canAccessAdminPanel: boolean;
  /** Gates Departments + config pages. lab_manager and above. */
  canAccessAdmin: boolean;
  canViewRevenue: boolean;
  canManageUsers: boolean;
  canWrite: boolean;
};

export function getPermissions(
  role: FacilityRole | null,
  isSuperAdmin: boolean
): RolePermissions {
  if (isSuperAdmin) {
    return {
      canAccessAdminPanel: true,
      canAccessAdmin: true,
      canViewRevenue: true,
      canManageUsers: true,
      canWrite: true,
    };
  }
  if (!role) {
    return {
      canAccessAdminPanel: false,
      canAccessAdmin: false,
      canViewRevenue: false,
      canManageUsers: false,
      canWrite: false,
    };
  }
  switch (role) {
    case "facility_admin":
      return {
        canAccessAdminPanel: true,
        canAccessAdmin: true,
        canViewRevenue: true,
        canManageUsers: true,
        canWrite: true,
      };
    case "lab_manager":
      return {
        canAccessAdminPanel: false,
        canAccessAdmin: true,
        canViewRevenue: true,
        canManageUsers: false,
        canWrite: true,
      };
    case "lab_technician":
      return {
        canAccessAdminPanel: false,
        canAccessAdmin: false,
        canViewRevenue: false,
        canManageUsers: false,
        canWrite: true,
      };
    case "viewer":
      return {
        canAccessAdminPanel: false,
        canAccessAdmin: false,
        canViewRevenue: false,
        canManageUsers: false,
        canWrite: false,
      };
    default:
      return {
        canAccessAdminPanel: false,
        canAccessAdmin: false,
        canViewRevenue: false,
        canManageUsers: false,
        canWrite: false,
      };
  }
}

/** Roles allowed to access the full Admin panel (/dashboard/admin) */
export const ADMIN_PANEL_ROLES: FacilityRole[] = ["facility_admin"];

/** Roles allowed to call admin user-management APIs */
export const ADMIN_USER_MANAGER_ROLES: FacilityRole[] = [
  "facility_admin",
  "lab_manager",
];

/** Roles allowed to view revenue / financial analytics */
export const REVENUE_ROLES: FacilityRole[] = [
  "facility_admin",
  "lab_manager",
];

/** Human-readable labels for facility roles (admin UI). */
export const FACILITY_ROLE_LABELS: Record<FacilityRole, string> = {
  facility_admin: "Facility Admin",
  lab_manager: "Lab Manager",
  lab_technician: "Lab Technician",
  viewer: "Viewer",
};

const ROLE_RANK: Record<FacilityRole, number> = {
  facility_admin: 4,
  lab_manager: 3,
  lab_technician: 2,
  viewer: 1,
};

export function roleRank(role: FacilityRole): number {
  return ROLE_RANK[role] ?? 0;
}

/** Display label for a stored role string (normalizes legacy values). */
export function facilityRoleLabel(role: string): string {
  const r = role?.trim().toLowerCase();
  if (r === "admin") return FACILITY_ROLE_LABELS.facility_admin;
  if (r === "manager") return FACILITY_ROLE_LABELS.lab_manager;
  if (r === "technician" || r === "reception") return FACILITY_ROLE_LABELS.lab_technician;
  if (isFacilityRole(role)) return FACILITY_ROLE_LABELS[role];
  return FACILITY_ROLE_LABELS.viewer;
}

/**
 * Roles the actor may assign to others (cannot assign above own rank).
 * Super admin may assign any facility role.
 */
export function assignableFacilityRoles(
  actorRole: FacilityRole | null,
  isSuperAdmin: boolean
): FacilityRole[] {
  if (isSuperAdmin) return [...FACILITY_ROLES];
  if (!actorRole) return [];
  const cap = roleRank(actorRole);
  return FACILITY_ROLES.filter((x) => roleRank(x) <= cap);
}
