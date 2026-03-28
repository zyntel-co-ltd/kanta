# Kanta — Integrations

**Last updated:** 2026-03-28  

| System | How connected | Direction | Purpose | Fallback if down |
|--------|---------------|-----------|---------|------------------|
| Supabase | JS client + service role | R/W | Auth + DB | App unavailable |
| PostHog | posthog-js / server | Write | Analytics + flags | Flags per product rules |
| Upstash Redis | REST | R/W | Cache / rate limits | Degraded behaviour |
| Sentry | SDK | Write | Errors | No crash reporting |
| Anthropic | REST | Write | AI features | NL / summaries disabled |
| Vercel | Hosting | — | Deploy | — |
