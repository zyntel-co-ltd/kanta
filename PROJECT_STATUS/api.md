# Kanta — API Surface

**Last updated:** 2026-04-01 (ENG-157 console provisioning)  

List significant `app/api/**` routes: method, path, auth, purpose, rate limits where relevant.

*Populate from codebase; see `phase-log.md` for historical file-level changes until this file is complete.*

---

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/facility/test-requests-status?facility_id=` | Session + facility access | `empty: true` when no `test_requests` for facility (ENG-89 empty states). |
| GET | `/api/cron/lims-sync` | `Authorization: Bearer CRON_SECRET` | Vercel Cron — sync all active `lims_connections` (ENG-89). Returns `{ synced, errors }`. |
| POST | `/api/admin/data-connections/sync` | Admin panel | Manual LIMS sync (ENG-88); see `phase-log.md`. |
| GET | `/api/console/facilities` | Session; **`isSuperAdmin` only** | All `hospitals` rows (ENG-156). |
| POST | `/api/console/facilities` | Session; **`isSuperAdmin` only** | Create hospital row; optional `parent_hospital_id` for branch (ENG-157). Returns `{ facility_id, name }`. |
| POST | `/api/console/users` | Session; **`isSuperAdmin` only** | Create Supabase auth user + `facility_users` as `facility_admin` (ENG-157). Body: `facility_id`, `email`, `full_name`, `password`. |
| GET | `/api/console/platform-admins` | Session; **`isSuperAdmin` only** | Read-only `platform_admins` (`user_id`, `created_at`) for Console (ENG-157). |
| POST | `/api/admin/users/sync` | Session; **`isSuperAdmin` only** | Link `auth.users` missing from `facility_users` as `viewer` for given `facility_id`. Returns `{ synced }`. |
