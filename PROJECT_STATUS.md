# Kanta — Project Status

See `PROJECT_STATUS/START_HERE.md`. Cursor: read that file before writing any code.

## Module color map (ENG-131)

Canonical accents live in `lib/design-tokens.ts` as `MODULE_COLORS` and in `app/globals.css` under `[data-module="…"]` (`--module-primary`, `--sidebar-active-bg`). **Lab Metrics** → teal `#0f766e`; **Asset Management** → sky `#0284c7`; **Quality & samples** → indigo `#6366f1`; **AI Insights** and **Admin/Settings** → emerald `#059669`. Sidebar shell stays white; only the active pill (and collapse toggle) use `--sidebar-active-bg`.

## Database migrations (log)

| Applied (repo) | File | Notes |
|----------------|------|--------|
| 2026-03-29 | `supabase/migrations/20260329120000_post_mazra_cleanup.sql` | Post-Mazra pivot: drop `mazra_generated` columns, hospital `classification` / `subscription_status`, facility-scoped RLS, canonical Mazra hospital names — idempotent |
| 2026-03-29 | `supabase/migrations/20260329140000_lab_sections_shifts_audit_app.sql` | ENG-85: `lab_sections`, `lab_shifts`, `tat_targets.section_id`; ENG-64: relax `audit_log.action` CHECK, add `user_id` / `entity_type`; seed sections/shifts per hospital |
| 2026-03-29 | In-place edits to older migration files (same filenames) | **`supabase db push` hardening** for Mazra / partial prod: `20250321000001` — backfill `facility_id` from `hospital_id` only if that column exists; `20250321000003` — create `facility_role` only if missing; `20250321000006` — `tat_targets` uniqueness via expression index (not invalid inline `UNIQUE`); `20260322000001` — `ALTER lab_racks ADD COLUMN status` when table pre-exists without it |
| 2026-04-01 | `supabase/migrations/20260401120000_lims_data_bridge.sql` | ENG-87: `lims_connections`, `lims_sync_log`, `test_requests.lims_*` dedupe index; RLS for facility members |

## Phase — ENG-87 LIMS Data Bridge (library)

- **Added** `lib/data-bridge/` — types, abstract `LIMSConnector`, PostgreSQL (`pg`) implementation, MySQL stub, TAT transformer, `runLIMSSync` orchestration, AES-GCM helpers (`LIMS_ENCRYPTION_KEY`), Nakasero reference doc `connectors/NAKASERO_MAPPING.md`.
- **Deps:** `pg`, `@types/pg`, `server-only`.
- **Verify:** `npm run lint`, `npm run type-check`, `npm run build`; apply migration in Supabase; set `LIMS_ENCRYPTION_KEY` on Vercel for encrypted LIMS credentials.

## Phase — ENG-88 LIMS admin UI

- **Page:** `/dashboard/admin/data-connections` (facility admin panel only) — connection form, Nakasero-style column mapping placeholders, Test connection, Save (encrypted), Enable sync toggle, Sync now, last 10 `lims_sync_log` rows.
- **API:** `GET|POST|PATCH /api/admin/data-connections`, `POST .../test` (10s timeout, optional `connection_id` to test saved creds without retyping password), `POST .../sync` — all gated with `requireAdminPanel`.
- **Nav:** Sidebar System → “Data Connections”; `lib/recentVisits.ts` label.

## App / ops (2026-03-29)

- **ENG-86:** Lab Metrics filters/charts use `useFacilityConfig` + `/api/facility/lab-config`; admin config GETs opened to facility members; `LabMetricsConfigEmpty` when no sections.
- **ENG-84:** PostHog flags inventory in `lib/featureFlags.ts` + `zyntel-playbook/12-projects/kanta/feature-flags.md`; page gates for refrigerator, intelligence, LRIDS display; Settings copy clarifies Zyntel-managed flags.
- **API v1 / prod DB:** `lib/db.ts` and v1 routes scope asset queries by **`facility_id`** (query param name `hospital_id` unchanged for clients).

## App / ops (2026-03-29 — UX & QC polish)

- **Loading UI:** `components/ui/PageLoader.tsx` exports staggered **LoadingBars** (lab-metrics style) using `var(--module-primary)`; route `loading.tsx` files and in-page waits (auth, samples, refrigerator, maintenance, equipment, admin, tracker/reception/progress, QC, meta, etc.) use the same pattern.
- **Lab Metrics:** `LabMetricsConfigEmpty` shows only after facility lab config fetch completes (`!labConfigLoading && !hasConfiguredSections`) on TAT, Tests, Numbers, Revenue, Meta — avoids a false “no sections” flash.
- **Samples → Racks:** rack grid uses CSS grid + column `minmax` + gaps so cells use horizontal space in the card.
- **Sidebar:** collapse control positioned at `top-4` / `right-1` inside the sidebar; `DashboardChrome` wraps the sidebar in an `overflow-visible` column so protruding controls remain clickable.
- **QC Management:** quantitative and qualitative tabs in `app/dashboard/qc/page.tsx` plus `components/qc/QuantitativeQCTab.tsx` use **qualityQc** module tokens (`module-accent-text`, `module-accent-soft-text`, `var(--module-primary*)`) instead of hardcoded emerald/green.

## App / ops (2026-03-29 — hospital branding & sidebar nav)

- **`lib/hospitalDisplayName.ts`** — UI hospital label: `facilityAuth.hospitalName` (from `/api/me` / `hospitals.name`) → `NEXT_PUBLIC_HOSPITAL_NAME` → fallback `"Hospital"` (no hardcoded tenant name in components).
- **Chrome:** `Sidebar`, `TopBar`, `dashboard/home` hero use `hospitalDisplayName`; QC **Visualization** L-J chart title uses the same name (uppercase) instead of a fixed “IOM UGANDA” string.
- **Public LRIDS:** `GET /api/tat/lrids` returns `hospital_name` / `hospital_logo_url` from `hospitals` for the requested `facility_id`; `app/kanta/[facility]/lrids/page.tsx` shows header/footer branding from that payload (env logo fallback).
- **`GET /api/admin/hospital`** (Supabase off): mock `name` uses env or `"Hospital"`, not a fixed Zyntel string.
- **Sidebar active state:** `isNavActive` treats `/dashboard/admin` separately so **`/dashboard/admin/hospital` does not highlight “Admin”** — only Hospital Settings is active there.

## App / ops (2026-03-30 — sidebar route matching)

- **System vs Asset accordion behavior:** `components/dashboard/Sidebar.tsx` `accordionGroupForPath()` now treats `"/dashboard"` as an exact match; Asset Management no longer auto-expands when opening System pages (`/dashboard/settings`, `/dashboard/admin`, `/dashboard/departments`).

## App / ops (2026-03-30 — ENG-102 TAT navigation)

- **TAT submodule navigation restructure:** `app/dashboard/tat/page.tsx` now shows exactly `Patient Tracking`, `Test Tracker`, `Section Capture`, `Volume`; old TAT `Overview` / `Performance` / `Progress` tabs removed.
- **Route cleanup:** `app/dashboard/performance/page.tsx` removed; alias redirects added at `app/dashboard/lab-metrics/tat/patients`, `.../reception`, `.../volume` to point to the new destinations.
- **Navigation alignment:** `components/dashboard/Sidebar.tsx` and `components/dashboard/AppTabBar.tsx` updated to new TAT labels/paths; `/dashboard/performance` removed from Lab match prefixes; LRIDS remains standalone/new-tab.

## App / ops (2026-03-30 — LRIDS visibility)

- **LRIDS visibility widened:** removed `show-lrids` UI gating in `components/dashboard/Sidebar.tsx`, `components/dashboard/AppTabBar.tsx`, and `app/dashboard/progress/page.tsx` so LRIDS entry points are visible to all users in-app.
- **Token protection retained:** standalone LRIDS board still uses token-based access (`/api/lrids/token` + `/lrids/[facilityId]?token=...`), so visibility is broad while board access remains signed-link controlled.
