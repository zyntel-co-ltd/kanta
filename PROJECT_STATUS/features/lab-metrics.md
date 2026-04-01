# Kanta — Lab Metrics Features

**Last updated:** 2026-04-01  
**Module:** Lab Metrics  

Feature blocks to be written during the next session touching this module. Until then, see **`../phase-log.md`**.

### LIMS → dashboards (ENG-87–89)

- **Sync:** Vercel Cron `GET /api/cron/lims-sync` every 15 minutes (`CRON_SECRET`); manual **Admin → Data Connections → Sync now** and `POST /api/admin/data-connections/sync`. Populates `test_requests`; TAT / Numbers / Revenue read from that table.
- **Empty state:** When lab sections are configured but `test_requests` is empty, TAT, Numbers, and Revenue show **`LimsTestDataEmpty`** with a link to `/dashboard/admin/data-connections` (see `useTestRequestsEmpty`, `GET /api/facility/test-requests-status`).
- **Docs:** `docs/LIMS_SYNC.md`.
