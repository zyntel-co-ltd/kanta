# Kanta — Start Here

**Last updated:** 2026-03-28  
**Updated by:** Cursor  
**Product type:** SaaS — hospital lab operations & asset intelligence  
**Status:** Active development — MVP, Phase 29 complete  
**Production URL:** https://app.zyntel.net  
**Repo:** github.com/zyntel-co-ltd/kanta  

---

## What This Product Is

**Kanta** is Zyntel’s flagship **Hospital Operational Intelligence** platform: equipment tracking (QR, sensors), turnaround-time (TAT) intelligence, lab metrics, quality control (including Westgard / Levey-Jennings and samples), refrigeration telemetry, admin and RBAC, and an **AI intelligence** layer (TAT anomaly signals, natural-language dashboard queries, weekly summaries, predictive fault scaffolding). The app is multi-tenant (`facility_id`), built on **Next.js 16** and **Supabase**, with PostHog, Sentry, Redis, and optional Anthropic for AI features.

Hospital staff use a unified dashboard with **three app domains**: **Lab Metrics**, **Quality & samples**, and **Asset Management**, with a **Start Here** hub at `/dashboard/home`. Navigation is driven by **`components/dashboard/Sidebar.tsx`** (and related layout). There is no public self-signup — admins provision users via **Admin → Users**.

---

## Current Build State

| Module | State | Notes |
|--------|-------|-------|
| Auth & sessions | ✅ Live | Supabase SSR, middleware, password reset |
| Asset Management | ✅ Live | Equipment CRUD, QR scan, maintenance, analytics |
| Lab Metrics | ✅ Live | TAT, tests, revenue, performance, LRIDS |
| Quality & samples | ✅ Live | QC, Westgard/L-J, samples, hub pages |
| Admin & settings | ✅ Live | Users, hospital settings (ENG-80), RBAC v2 |
| AI Intelligence | ✅ Live | NL queries, weekly summaries, anomaly / telemetry |
| Refrigerator | ✅ Live | Telemetry (feature-flagged where applicable) |
| PostHog feature flags | 🔨 In progress | ENG-83 |
| Reception / TAT tab | 🔨 In progress | ENG-77 (if still open — confirm in Linear) |
| Multi-tenant billing | 📋 Planned | — |

---

## What's In This Folder

| File | What it contains |
|------|------------------|
| `START_HERE.md` | This file — product, build state, Cursor + Claude instructions |
| `stack.md` | Stack, environments, env vars, how to run locally |
| `data-model.md` | Tables, RLS, constraints (to be expanded) |
| `features/*.md` | Full feature specs per module (six-question blocks) |
| `roles.md` | Facility roles and permissions |
| `integrations.md` | Supabase, PostHog, Redis, Anthropic, etc. |
| `api.md` | API routes / external surface |
| `decisions.md` | Key architectural decisions (append-only) |
| `issues.md` | Active blockers |
| `phase-log.md` | **Append-only** engineering history — **do not attach to Claude** |

---

## Cursor: Read Before Writing Any Code

- **Base branch:** `development` for features — do not commit directly to `main` without policy.
- **Linear team:** Engineering (ENG).
- **Before touching a feature:** read `features/[module].md` for that area (or write the blocks first if missing).
- **After any change:** update this file’s build table + the relevant `features/*.md`; `data-model.md` if schema changed; `issues.md` / `decisions.md` as needed.
- **Key files:** `components/dashboard/Sidebar.tsx` (navigation), `lib/AuthContext.tsx`, `lib/supabase.ts`, `lib/redis.ts`, `supabase/migrations/`.
- **Do not touch:** Supabase schema without a migration file.

---

## Claude Project

Attach every file in **`PROJECT_STATUS/`** except **`phase-log.md`**. After a push that changes files, re-attach updated files before a new session. **`phase-log.md`** is history only.

---

*Management portfolio: `knowledge/zyntel-playbook/06-operations/projects-status.md`*
