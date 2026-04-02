# Hospital groups and branches (ENG-91)

## Model

- **`hospital_groups`** — One row per logical hospital group (e.g. “Nakasero Hospital Group”): `id`, `name`, `slug` (unique), `created_at`.
- **`hospitals`** — Still one row per **branch** (facility). Each branch has its own `id` used everywhere as `facility_id` (tenancy, PostHog `branch` group, RLS, etc.).
- **`hospitals.group_id`** — Optional FK to `hospital_groups`. `NULL` means a **standalone** facility (not part of a named group).
- **`hospitals.branch_name`** — Optional label for this row when it belongs to a group (e.g. “Main Branch”, “North Clinic”). Shown in the app chrome as `{hospitals.name} — {branch_name}` when `group_id` is set and `branch_name` is non-empty.

PostHog feature flags remain **per branch**: targeting uses `facility_id` as the group key (ENG-83). Creating a group does not merge flags; each branch keeps its own overrides in PostHog.

## Who configures what

| Action | Who |
|--------|-----|
| Create/delete groups; assign facilities to a group; set branch names (initial assignment) | Zyntel **platform super-admin** (`platform_admins`) — **Admin → Hospital groups** (`/dashboard/admin/groups`) |
| Edit **branch name** for their own facility | **Facility admin** — **Admin → Hospital settings**, when the facility is already in a group |
| Change **group membership** or group display name | Not in the facility Admin UI — use **Hospital groups** as super-admin |

## Setup flow (platform admin)

1. Open **Admin → Hospital groups** (visible only to super-admins).
2. Create a group (name; slug is generated and made unique).
3. For each facility row, choose the group and enter a **branch name**, then **Save**.
4. To remove a facility from a group, set **Group** to “Standalone” and save (clears `group_id` and `branch_name`).

## Database

Apply migrations (includes `20260402150000_hospital_groups_eng91.sql`). Existing `hospitals` rows keep `group_id = NULL` until assigned.

## Related code

- Display: `facilityBrandingLine()` in `lib/hospitalDisplayName.ts`; `FacilityAuthState` in `lib/AuthContext.tsx` (`groupId`, `groupName`, `branchName` from `GET /api/me`).
- APIs: `GET/PATCH /api/admin/hospital`, `GET/POST /api/admin/groups`, `PATCH/DELETE /api/admin/groups/[id]`, `PATCH /api/admin/hospitals/branch`.
