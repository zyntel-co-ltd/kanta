# Kanta — Project Status

**Last updated:** March 2026  
**Updated by:** Cursor

---

## What This Project Is

Kanta is the flagship SaaS product — Hospital Operational Intelligence Platform. Equipment tracking (QR, sensors), TAT intelligence, departmental workflow visibility for hospitals. Lab-first launch strategy. MVP in development.

---

## Current State

**Status:** In development  
**Phase:** MVP — Equipment module being built

### What Is Built and Working

- [x] Next.js 14+ app with Supabase
- [x] Dashboard layout (sidebar, top bar, ticker)
- [x] Equipment API routes (CRUD)
- [x] Departments API
- [x] Scans API
- [x] Dashboard KPI cards, charts (equipment status, daily scans, category donut, asset value)
- [x] QR code scanning (html5-qrcode)
- [x] PWA setup (@ducanh2912/next-pwa)

### What Is In Progress

- [ ] Multi-tenant architecture (facility_id)
- [ ] Offline-first PWA sync
- [ ] Equipment categories (A/B/C) full implementation
- [ ] QC module integration planning

### What Is Planned (Next Up)

- [ ] First paying hospital on equipment module
- [ ] TAT module (inherits from Nakasero dashboard)
- [ ] Lab-hub QC integration

---

## Stack & Infrastructure

| Layer | Technology | Environment |
|-------|------------|-------------|
| Frontend | Next.js 16 + TypeScript | Vercel — free |
| Backend | Next.js API Routes | Vercel |
| Database | Supabase PostgreSQL | Kanta project |
| Storage | Cloudflare R2 | Planned |
| Cache | Upstash Redis | Planned |

---

## Environment Status

| Environment | URL | Status |
|-------------|-----|--------|
| Production | N/A | Not deployed |
| Staging | N/A | N/A |
| Local dev | http://localhost:3000 | Standard |

---

## Active Issues / Blockers

| Issue | Linear ID | Status | Notes |
|-------|-----------|--------|-------|
| — | — | — | Check Linear for current |

---

## Key Decisions Made

| Decision | Outcome | Date |
|----------|---------|------|
| Lab-first launch | Laboratory is department one; radiology, pharmacy follow | March 2026 |
| Repo structure | kanta (not hospital-os) — standalone Next.js | — |

---

## Branch State

| Branch | Purpose | Last active |
|--------|---------|-------------|
| `main` | Production (when deployed) | — |
| `development` | Integration / staging | March 2026 |

---

## How to Run This Project Locally

```bash
git clone git@github.com:zyntel-co-ltd/kanta.git
cd kanta

npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

npm run dev
```

---

## Cursor Context (Read Before Writing Any Code)

- **Base branch:** `development` (never commit directly to `main`)
- **Linear team:** Engineering (ENG)
- **Key files:**
  - `app/dashboard/page.tsx` — Dashboard
  - `app/api/equipment/route.ts` — Equipment API
  - `lib/supabase.ts` — Supabase client
  - `supabase/schema.sql` — Database schema
- **Do not touch:** Supabase schema without migration
- **Code style:** TypeScript strict — see `.cursor/rules/`

---

*For management overview, see: [knowledge/zyntel-playbook/06-operations/projects-status.md](../../knowledge/zyntel-playbook/06-operations/projects-status.md)*
