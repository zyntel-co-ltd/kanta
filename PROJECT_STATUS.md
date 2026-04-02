# Kanta — Project Status

See `PROJECT_STATUS/START_HERE.md`. Cursor: read that file before writing any code.

## Module color map (ENG-81 / ENG-131)

**Brand-locked** — not configurable per hospital (see `zyntel-playbook/12-projects/kanta/design-system.md`). Canonical accents: `lib/design-tokens.ts` `MODULE_COLORS`, `app/globals.css` §13 `[data-module="…"]`. **Home / AI Insights / Admin** → emerald `#059669`; **Lab Metrics** → navy `#21336a`; **Quality & Samples** → sky `#0284c7`; **Asset Management** → slate `#475569`. Sidebar shell is always white; only the active pill uses `--sidebar-active-bg`.

## Database migrations (log)

| Applied (repo) | File | Notes |
|----------------|------|--------|
| 2026-03-29 | `supabase/migrations/20260329120000_post_mazra_cleanup.sql` | Post-Mazra pivot: drop `mazra_generated` columns, hospital `classification` / `subscription_status`, facility-scoped RLS, canonical Mazra hospital names — idempotent |
| 2026-03-29 | `supabase/migrations/20260329140000_lab_sections_shifts_audit_app.sql` | ENG-85: `lab_sections`, `lab_shifts`, `tat_targets.section_id`; ENG-64: relax `audit_log.action` CHECK, add `user_id` / `entity_type`; seed sections/shifts per hospital |
| 2026-03-29 | In-place edits to older migration files (same filenames) | **`supabase db push` hardening** for Mazra / partial prod: `20250321000001` — backfill `facility_id` from `hospital_id` only if that column exists; `20250321000003` — create `facility_role` only if missing; `20250321000006` — `tat_targets` uniqueness via expression index (not invalid inline `UNIQUE`); `20260322000001` — `ALTER lab_racks ADD COLUMN status` when table pre-exists without it |
| 2026-04-01 | `supabase/migrations/20260401120000_lims_data_bridge.sql` | ENG-87: `lims_connections`, `lims_sync_log`, `test_requests.lims_*` dedupe index; RLS for facility members |
| 2026-04-01 | `supabase/migrations/20260401190000_rls_security_fixes.sql` | ENG-154: RLS on `login_audit`, `qc_results`, `platform_admins`, `facility_invites`, `lab_sections`, `lab_shifts`; revoke SELECT on `facility_invites.token` for anon/authenticated; `search_path` on 4 functions |
| 2026-04-01 | `supabase/migrations/20260402120000_hospitals_parent_hospital_id.sql` | ENG-157: optional `hospitals.parent_hospital_id` FK for branch / hospital groups |
| 2026-04-02 | `supabase/migrations/20260402130000_qc_corrective_followup_tracking.sql` | ENG-163: qualitative QC follow-up lifecycle fields (`followup_status`, rerun linkage, closure timestamps) |
| 2026-04-02 | `supabase/migrations/20260402142000_qc_lot_review_recommendations.sql` | ENG-166: `qc_lot_recommendations` table for repeated-lot Westgard recommendation tracking |
| — | *(no migration)* | ENG-156: Zyntel Console `/dashboard/console` (super-admin), `/api/console/facilities`, `POST /api/admin/users/sync` |

## Phase — ENG-157 Console hospital provisioning (2026-04-01)

- **Console UI:** `/dashboard/console/facilities` — **New hospital** slide-over (name, city, country default Uganda, tier free/professional/enterprise); **Add branch to existing group** (branch name, searchable parent hospital, city, country); after create, **Add facility admin** modal opens. Each row **Add admin** — auto-generated 12-char password (`crypto.getRandomValues`), `POST /api/console/users`, success credential block + clipboard.
- **API:** `POST /api/console/facilities` (create hospital; optional `parent_hospital_id` with graceful fallback if column missing), `POST /api/console/users` (first `facility_admin`), `GET /api/console/platform-admins` (read-only `platform_admins` for Super-admins view).
- **Console home:** Super-admins card opens read-only list + amber SQL callout (no UI promotion).
- **Verify:** apply migration; `npm run type-check`.

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

## App / ops (2026-03-30 — ENG-150 AI panel trigger availability)

- **AI trigger verified on all dashboard routes:** `components/dashboard/TopBar.tsx` renders `NLQueryBar` unconditionally (no route/module gating), and `components/dashboard/DashboardChrome.tsx` mounts `TopBar` for all dashboard pages.
- **Prop threading clarified:** `NLQueryBar` now receives `facilityId={alertsFacilityId ?? null}` and `userId={user?.id}` explicitly.
- **Inline intent comment added:** documented above `<NLQueryBar .../>` that the AI side panel is available on all routes and opens as a right-side panel without navigation.

## App / ops (2026-04-02 — ENG-63 offline-first sync queue hardening)

- **Connectivity probe aligned to spec:** `lib/SyncQueueContext.tsx` now probes `"/api/health"` using `HEAD` every 30s (instead of `GET /api/healthcheck`), and `app/api/health/route.ts` now supports `HEAD` with fast `200` response.
- **Offline queue expanded to sample operations:** `app/dashboard/samples/page.tsx` mutating calls now use `queuedFetch` for sample add/delete, rack create/delete, rack discard, and discarded-item delete; queued writes replay via existing FIFO sync flush.
- **Top bar alert actions queue-enabled:** `components/dashboard/TopBar.tsx` alert acknowledgement/dismiss `PATCH` writes now use `queuedFetch`, preserving offline behavior consistency.
- **Admin configuration writes queue-enabled:** `components/dashboard/admin/AdminConfigurationSection.tsx` section/shift/TAT target mutations moved to `queuedFetch`.

## App / ops (2026-04-02 — ENG-148 AI panel push layout refactor)

- **Shared panel state in layout context:** `lib/SidebarLayoutContext.tsx` now exposes `aiPanelOpen` and `setAiPanelOpen`; state is in-memory only (not persisted to localStorage).
- **NLQueryBar converted from centered modal to slide panel:** `components/ai/NLQueryBar.tsx` now renders as a fixed right drawer on desktop (`w-[380px]`, full height, `translateX` transition) and a mobile bottom sheet (`translateY` transition), both via `createPortal`.
- **Dashboard push behavior added:** `components/dashboard/DashboardChrome.tsx` now reads `aiPanelOpen` and applies a desktop-only `margin-right: 380px` transition to the main content wrapper and `main` area so TopBar/tab strip/content compress together while panel is open.
- **Close interactions preserved:** backdrop click, close button, and Escape from input all close the panel via `setAiPanelOpen(false)`; chat logic and suggestions remain intact.

## App / ops (2026-04-02 — ENG-152 expanded sidebar overlay mode)

- **Expanded sidebar now overlays instead of consuming layout width:** `components/dashboard/Sidebar.tsx` uses conditional positioning — collapsed rail remains in-flow (`relative`, `w-[60px]`), expanded sidebar becomes fixed overlay (`fixed top-0 left-0`, `w-[260px]`, `z-[150]`).
- **Backdrop dismiss for overlay mode:** `components/dashboard/DashboardChrome.tsx` now renders `fixed inset-0 bg-black/30 z-[149]` when expanded; clicking backdrop collapses sidebar via `setCollapsed(true)`.
- **Chrome structure aligned for overlay behavior:** sidebar is rendered outside the main content wrapper with a collapsed-width suspense fallback spacer, while TopBar/app tabs/main stay in the primary content column.
- **Transition + controls preserved:** existing collapse glyph/button behavior and sidebar transitions remain intact while adopting overlay semantics.

## App / ops (2026-04-02 — ENG-149 AI response navigation chips)

- **Structured link extraction in AI query API:** `app/api/ai/query/route.ts` now instructs the model to append `[LINKS: ...]`, extracts/removes that block from assistant text, validates/whitelists dashboard hrefs, caps to 3 links, and returns `links` with the response.
- **Malformed link JSON is non-fatal:** parsing failures are caught and logged (`console.warn`), while API still returns `200` with `links: []` (no hard error path).
- **Chat message model expanded:** `components/ai/NLQueryBar.tsx` `Message` now supports optional `links` and maps `data.links` from `/api/ai/query`.
- **Clickable route chips in assistant bubbles:** assistant messages render navigation pills with `ArrowRight`; clicking chips calls `router.push(href)` and intentionally keeps the AI panel open.

## App / ops (2026-04-02 — ENG-153 tooltip UX upgrade)

- **Tooltip component upgraded:** `components/ui/Tooltip.tsx` now supports optional `description` and renders two-line tooltips (headline + explanatory sub-line) while preserving existing single-line behavior and mobile hidden bubble behavior.
- **Sidebar copy quality improved:** `components/dashboard/Sidebar.tsx` nav items now carry descriptive `tooltip` text; collapse/expand and log-out controls now explain intent instead of echoing labels.
- **TopBar actions clarified:** `components/dashboard/TopBar.tsx` tooltips now describe alerts, sync status, dismiss/close actions, console access, and user menu behavior.
- **Browser-native titles replaced in dashboard interactions:** removed `title=` tooltip fallbacks on key interactive elements and replaced with styled `Tooltip` triggers in `app/dashboard/numbers/page.tsx`, `components/dashboard/AppTabBar.tsx`, `components/dashboard/ScanFeed.tsx`, `components/dashboard/AddEquipmentModal.tsx`, and `components/ai/NLQueryBar.tsx`.

## App / ops (2026-04-02 — ENG-151 AI panel history persistence)

- **Persistence behavior confirmed by architecture:** `components/ai/NLQueryBar.tsx` now includes an explicit comment documenting why message state survives same-layout `/dashboard/*` route transitions under Next.js App Router.
- **No storage added intentionally:** chat state remains in-memory React state only; no `localStorage`, `sessionStorage`, or backend persistence introduced.

## App / ops (2026-04-02 — ENG-163 corrective-action follow-up closure)

- **Qualitative follow-up lifecycle added:** `qualitative_qc_entries` now tracks `followup_status` (`none/open/closed/override`), rerun linkage (`rerun_for_entry_id`, `rerun_entry_id`), closure timestamp, and optional override reason.
- **API linkage + closure logic:** `app/api/qc/qualitative/entries/route.ts` and `[id]/route.ts` now link reruns to failed incidents and auto-close follow-up when linked rerun passes.
- **Audit evidence trail:** qualitative QC create/update events now emit app-level audit entries with old/new lifecycle state to support ISO 15189 evidence workflows.
- **UI follow-up visibility:** `app/dashboard/qc/page.tsx` now surfaces open corrective actions, allows rerun-to-incident linkage in entry flow, and displays follow-up status in qualitative log views.

## App / ops (2026-04-02 — ENG-164 proactive QC drift alerts)

- **Drift heuristic introduced:** `lib/westgard.ts` now exposes `detectDriftAlerts()` for same-side, non-decreasing z-score drift toward ±2 SD over configurable run windows.
- **Runs API enriched:** `app/api/qc/runs/route.ts` now includes per-point `drift_alert` metadata alongside existing status flags.
- **Visualization + stats signals:** `app/dashboard/qc/page.tsx` now renders proactive drift cards in QC Visualization and labels drift-flagged points distinctly in QC Stats before hard rule violations.

## App / ops (2026-04-02 — ENG-166 repeated-lot review recommendations)

- **Recommendation persistence:** added `qc_lot_recommendations` table for analyte/lot recommendation state (`open/acknowledged/resolved`) and violation window counts.
- **Automatic recommendation trigger:** `app/api/qc/runs/route.ts` now upserts a recommendation when repeated flagged Westgard runs for the same lot exceed threshold in rolling window.
- **Recommendation APIs:** added `GET /api/qc/recommendations` and `PATCH /api/qc/recommendations/:id/ack`.
- **QC UI actioning:** QC Stats now shows “Review Lot” recommendations with acknowledge action and corresponding audit log writes.

## App / ops (2026-04-02 — ENG-167 lot transition comparison)

- **Previous-lot baseline detection:** QC Visualization now locates previous lot for same analyte/level and computes baseline mean/SD.
- **First-10-run transition overlay summary:** new lot’s first 10 runs are compared to prior baseline with mean shift, SD deltas, and recommendation (`Acceptable`, `Monitor`, `Investigate`).

## App / ops (2026-04-02 — ENG-165 monthly QC summary PDF export)

- **One-click monthly export added:** QC Stats includes month selector and `Export Monthly PDF` action per selected analyte/config.
- **Formatted report payload:** generated print-ready report includes monthly run table (L-J datapoints), violations section, and pass-rate summary metrics.

## App / ops (2026-04-02 — ENG-168 QC expiry calendar)

- **Expiry calendar surfaced:** quantitative and qualitative config views now show upcoming lot expiries in dedicated calendar-style lists.
- **Amber lead-time warnings:** both calendars expose configurable warning threshold (N days) and mark soon-expiring vs expired lots for proactive planning.

## App / ops (2026-04-02 — ENG-103 QR results scanning for TAT)

- **Scan UI:** added `/dashboard/lab-metrics/tat/scan` with continuous camera scanning plus a manual payload fallback.
- **Payload decode:** supports legacy delimiter payloads and JSON payloads via `lib/tat/qrPayload.ts`.
- **API wiring:** added `GET|PATCH /api/tat/scan` to look up active test requests and write section `time-in/time-out` timestamps; offline writes go through `queuedFetch` so scanning works without connectivity.
- **Navigation:** TAT `Section Capture` landing panel now links to “Open Scan Results”.

## App / ops (2026-04-02 — QC export UX refinements)

- **Monthly PDF availability improved:** QC Stats now auto-selects the latest month with data for the chosen control when the current month filter has no rows, preventing a disabled export state.
- **Visualization graph export added:** each L-J chart card now includes `Download L-J Graph PDF` that exports the currently date-filtered graph.
- **PDF metadata expanded:** visualization export includes control name, control level, lot number, selected date range, `Prepared by`, and download/print timestamp; filename also carries control/lot/date-range metadata.

## App / ops (2026-04-02 — ENG-90 TAT QR sample lookup placement)

- **Lab Metrics entry point added:** `app/dashboard/tat/page.tsx` Section Capture panel now includes `QR Sample Lookup (Results)` linking to `/dashboard/scan?scanPurpose=sample` (behind `show-sample-scan` flag).
- **Scan mode deep-link support:** `app/dashboard/scan/page.tsx` now reads `scanPurpose`/`purpose` query params and initializes in sample lookup mode when requested and feature-flagged.

## App / ops (2026-04-02 — ENG-169 Settings load latency)

- **Dashboard prefetch gated:** `components/dashboard/DashboardProviders.tsx` now only instantiates `DashboardDataProvider` on asset home (`/dashboard`) and analytics (`/dashboard/analytics`), so `Settings` no longer triggers dashboard KPI/scan/department fetches during app start/refresh.

## App / ops (2026-04-02 — ENG-90 sample lookup scanner UX)

- **Keyboard-wedge barcode scanner flow improved:** `app/dashboard/scan/page.tsx` sample lookup input now auto-focuses when sample mode is active and triggers lookup on scanner Enter suffix, reducing manual taps/clicks during high-volume scanning.

## App / ops (2026-04-02 — ENG-97 manual Section Capture workflow)

- **Reception API added:** `GET|PATCH /api/tat/reception` now provides facility-scoped section capture rows and secure timestamp stamping (`section_time_in` / `section_time_out`) with row ownership checks.
- **Section Capture UI implemented:** `components/tat/TatReceptionTab.tsx` adds date + section + search filters, Lab Number / anonymized patient token / test columns, green `Stamp In` / `Stamp Out` actions, and computed TAT minutes.
- **Edit safety window enforced:** stamped values can be corrected via `Edit` only within 30 minutes, after which API returns an edit-window error.
- **Tab visibility gated by feature flag:** `app/dashboard/tat/page.tsx` now shows the Reception/Section Capture tab only when `show-reception-tab` is enabled.
