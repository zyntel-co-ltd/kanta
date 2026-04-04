# Kanta — Integrations

**Last updated:** 2026-04-01  

| System | How connected | Direction | Purpose | Fallback if down |
|--------|---------------|-----------|---------|------------------|
| Customer LIMS (PostgreSQL, etc.) | `lib/data-bridge/` connectors + encrypted `lims_connections` | Read | Sync into `test_requests`; cron `/api/cron/lims-sync` + manual admin sync | Dashboards empty until sync succeeds; errors in `lims_sync_log` |
| Supabase | JS client + service role | R/W | Auth + DB | App unavailable |
| PostHog | posthog-js / server | Write | Analytics + flags | Flags per product rules |
| Upstash Redis | REST | R/W | Cache / rate limits | Degraded behaviour |
| Sentry | SDK | Write | Errors | No crash reporting |
| Anthropic | REST | Write | AI features | NL / summaries disabled |
| Vercel | Hosting | — | Deploy | — |
