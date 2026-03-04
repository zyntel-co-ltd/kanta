# Kanta.app — Architecture & Product Summary

---

## What You're Building

Two products, one platform:

1. **Kanta.app** — Hospital asset intelligence SaaS (QR-first, PWA, offline-capable)
2. **Zyntel API** — The backend-as-a-product, publicly exposed for future developer integrations (EMRs, insurance platforms, government health registries)

---

## Stack (Final)

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js + TypeScript on Vercel | Best DX, RSC reduces payload on slow connections |
| PWA/Offline | Next.js PWA + Workbox | Scan queue locally, sync on reconnect |
| Backend API | Next.js API Routes → migrate to standalone Fastify (Phase 2) | Start simple, graduate to dedicated API server |
| Database | Supabase PostgreSQL (Nairobi region) | On-continent, auth + RLS built in |
| File/QR Storage | Cloudflare R2 | Zero egress fees |
| CDN/DNS | Cloudflare | African PoPs in Nairobi, Lagos, Jo'burg |
| Queues | Upstash (Redis) | Serverless, pay-per-use, offline sync jobs |
| Monitoring | Sentry + PostHog | Errors + product analytics |
| Seed → AWS | af-south-1 (Cape Town) | ECS Fargate for backend, RDS if outgrow Supabase |

**Railway dropped** — No Africa region, cross-Atlantic latency, cost not justified at this stage.

---

## Architecture in Three Phases

### Phase 1 — Now (Pre-revenue to first 20 customers)

```
kanta.app users
      │
  Cloudflare
      │
  Vercel (Next.js — UI + API Routes + PWA)
      │
  Supabase Nairobi
  (Postgres + Auth + Storage + Realtime)
      │
  Cloudflare R2 (QR tag assets)
```

**Cost:** ~$0–50/month. Supabase free tier + Vercel hobby + Cloudflare free. Upgrade Supabase to Pro ($25/mo) before first paying customer.

---

### Phase 2 — Seed (20–200 customers, post-raise)

Extract backend into standalone **Fastify** Node.js service. This becomes `api.zyntel.app` — versioned, documented, rate-limited.

```
kanta.app (Vercel — Next.js frontend)
      │
api.zyntel.app (AWS Fargate — Fastify API)
      │
  ┌───┴───────────────┐
Supabase Nairobi    AWS SQS
(or RDS af-south-1) (async jobs, sync queue flush)
      │
  Upstash Redis (rate limiting, caching, session)
```

**Cost:** ~$300–800/month depending on traffic.

---

### Phase 3 — Series A (200+ hospitals, multi-country)

AWS multi-region (af-south-1 primary, eu-west for francophone Africa), read replicas, API gateway with usage plans per tier, dedicated developer portal for Zyntel API.

---

## Zyntel API as a Product

- **Version from day one** — `/api/v1/dashboard` never `/api/dashboard`
- **API key auth** — B2B integrations need key-based auth (Phase 2)
- **Rate limit by tier** — Free: 100 req/day, Starter: 5K, Enterprise: custom. Upstash Redis.
- **OpenAPI/Swagger** — Auto-generate from Fastify route schemas
- **Webhooks over polling** — Push equipment status changes to integrating systems

---

## PWA Offline Architecture

Hospitals in Kampala, Kisumu, Accra have unreliable WiFi. The PWA handles this:

```
Nurse scans QR code
      │
  [Online?] ──Yes──► POST /api/v1/scans → Supabase → confirmed
      │
      No
      │
  IndexedDB (kanta-offline-queue)
  stores: { equipmentId, action, timestamp, userId, ... }
      │
  OfflineSyncProvider watches connectivity
      │
  Reconnects → flushes queue → POST each → nurse sees "3 offline scans synced"
```

- **lib/offline-queue.ts** — IndexedDB store for pending scans
- **useLogScan** — POSTs when online, enqueues when offline
- **OfflineSyncProvider** — Flushes queue on `online` event, shows sync notification

---

## Plan / Tier → Infrastructure Mapping

Stored in `plan_config` table. API reads org tier and enforces limits.

| Tier | equipment_limit | history_days | api_calls |
|------|-----------------|--------------|-----------|
| free | 5 | 1 | 0 |
| starter | 50 | 90 | 5,000 |
| pro | 200 | 365 | 50,000 |
| enterprise | ∞ | ∞ | custom |

`features` JSONB toggles capabilities (api_access, webhooks, custom_integrations) without schema changes.

---

## Cost Optimization

| Stage | Monthly Infra | What's Running |
|-------|---------------|----------------|
| Pre-revenue | $25–50 | Supabase Pro + Cloudflare + Vercel hobby |
| First 20 customers | $80–150 | + Vercel Pro + Upstash pay-per-use |
| Post-seed (50 customers) | $400–700 | + AWS Fargate + SQS |
| 200 customers | $1,200–2,000 | Full AWS af-south-1 stack |

At $99/month Starter tier, **5 paying customers** cover all infrastructure costs.
