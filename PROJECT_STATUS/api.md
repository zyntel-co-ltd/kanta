# Kanta — API Surface

**Last updated:** 2026-04-01  

List significant `app/api/**` routes: method, path, auth, purpose, rate limits where relevant.

*Populate from codebase; see `phase-log.md` for historical file-level changes until this file is complete.*

---

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/facility/test-requests-status?facility_id=` | Session + facility access | `empty: true` when no `test_requests` for facility (ENG-89 empty states). |
| GET | `/api/cron/lims-sync` | `Authorization: Bearer CRON_SECRET` | Vercel Cron — sync all active `lims_connections` (ENG-89). Returns `{ synced, errors }`. |
| POST | `/api/admin/data-connections/sync` | Admin panel | Manual LIMS sync (ENG-88); see `phase-log.md`. |
