# LIMS sync (Data Bridge)

## Interval

- **Automated:** Vercel Cron calls `GET /api/cron/lims-sync` **every 15 minutes** (`vercel.json`).
- **Platform note:** On Vercel **Hobby**, the minimum cron schedule is **15 minutes**. Pro/Enterprise can use shorter schedules if needed.

## Manual sync

- **Admin UI:** **Admin → [Data Connections](/dashboard/admin/data-connections)** — **Sync now** for the facility’s LIMS connection.
- **API (authenticated, admin panel):** `POST /api/admin/data-connections/sync` with JSON `{ "facility_id": "<uuid>", "connection_id": "<optional>" }`.

## Cron authentication

- Set **`CRON_SECRET`** in Vercel (same variable as other cron routes, e.g. weekly summary).
- Vercel invokes cron with `Authorization: Bearer <CRON_SECRET>`.

## Sync logs

- Rows are stored in **`lims_sync_log`** (per facility / connection): timestamps, duration, rows fetched/upserted, errors.
- The Data Connections page shows the **last 10** runs; full history remains in the database for operators.

## Dashboards

- **TAT**, **Numbers**, and **Revenue** read aggregated data from **`test_requests`**, which the LIMS sync fills. If sections are configured but no rows exist yet, those pages show a prompt to configure **Data Connections**.

## Known limitations

- **Serverless time budget:** Each cron run processes active connections sequentially and stops if a **~24s** wall-clock budget is reached; remaining connections run on the **next** cron tick.
- **Connector fetch size:** Large backfills should rely on incremental **`last_synced_at`** fetches so each run stays within platform limits (see ENG-87 sync implementation).
