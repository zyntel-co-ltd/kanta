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
      canAccessAdmin: true,
      canViewRevenue: true,
      canManageUsers: true,
      canWrite: true,
    };
  }
  if (!role) {
    return {
      canAccessAdmin: false,
      canViewRevenue: false,
      canManageUsers: false,
      canWrite: false,
    };
  }
  switch (role) {
    case "facility_admin":
      return {
        canAccessAdmin: true,
        canViewRevenue: true,
        canManageUsers: true,
        canWrite: true,
      };
    case "lab_manager":
      return {
        canAccessAdmin: true,
        canViewRevenue: true,
        canManageUsers: true,
        canWrite: true,
      };
    case "lab_technician":
      return {
        canAccessAdmin: true,
        canViewRevenue: false,
        canManageUsers: false,
        canWrite: true,
      };
    case "viewer":
      return {
        canAccessAdmin: true,
        canViewRevenue: false,
        canManageUsers: false,
        canWrite: false,
      };
    default:
      return {
        canAccessAdmin: false,
        canViewRevenue: false,
        canManageUsers: false,
        canWrite: false,
      };
  }
}

/** Roles allowed to call admin user-management APIs */
export const ADMIN_USER_MANAGER_ROLES: FacilityRole[] = [
  "facility_admin",
  "lab_manager",
  "lab_technician",
  "viewer",
];

/** Roles allowed to view revenue / financial analytics */
export const REVENUE_ROLES: FacilityRole[] = [
  "facility_admin",
  "lab_manager",
];
