# Kanta — Project Status

See `PROJECT_STATUS/START_HERE.md`. Cursor: read that file before writing any code.

## Database migrations (log)

| Applied (repo) | File | Notes |
|----------------|------|--------|
| 2026-03-29 | `supabase/migrations/20260329120000_post_mazra_cleanup.sql` | Post-Mazra pivot: drop `mazra_generated` columns, hospital `classification` / `subscription_status`, facility-scoped RLS, canonical Mazra hospital names — idempotent |
