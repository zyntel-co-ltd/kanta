# Kanta — Project Status

See `PROJECT_STATUS/START_HERE.md`. Cursor: read that file before writing any code.

## Module color map (ENG-131)

Canonical accents live in `lib/design-tokens.ts` as `MODULE_COLORS` and in `app/globals.css` under `[data-module="…"]` (`--module-primary`, `--sidebar-active-bg`). **Lab Metrics** → teal `#0f766e`; **Asset Management** → sky `#0284c7`; **Quality & samples** → indigo `#6366f1`; **AI Insights** and **Admin/Settings** → emerald `#059669`. Sidebar shell stays white; only the active pill (and collapse toggle) use `--sidebar-active-bg`.

## Database migrations (log)

| Applied (repo) | File | Notes |
|----------------|------|--------|
| 2026-03-29 | `supabase/migrations/20260329120000_post_mazra_cleanup.sql` | Post-Mazra pivot: drop `mazra_generated` columns, hospital `classification` / `subscription_status`, facility-scoped RLS, canonical Mazra hospital names — idempotent |
| 2026-03-29 | `supabase/migrations/20260329140000_lab_sections_shifts_audit_app.sql` | ENG-85: `lab_sections`, `lab_shifts`, `tat_targets.section_id`; ENG-64: relax `audit_log.action` CHECK, add `user_id` / `entity_type`; seed sections/shifts per hospital |
