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
