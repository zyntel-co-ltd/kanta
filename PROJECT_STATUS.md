# Kanta — Project Status

**Last updated:** 22 March 2026 (Phase 11 — Chart.js, Module Tabs, Quantitative QC, Live Alerts)  
**Updated by:** Cursor

---

## What This Project Is

Kanta is the flagship SaaS product — Hospital Operational Intelligence Platform. Equipment tracking (QR, sensors), TAT intelligence, departmental workflow visibility for hospitals. Lab-first launch strategy. MVP in active development.

---

## Current State

**Status:** In development  
**Phase:** MVP — Phase 10 implemented. AI Intelligence Layer: TAT anomaly detection (Z-score/rolling baseline), natural language dashboard queries, weekly operational summaries, predictive fault signal infrastructure, and legal architecture for the data flywheel.

### What Is Built and Working

- [x] Next.js 16 app with Supabase
- [x] **Auth** — Email/password login (`/login`), password reset flow, middleware protection for `/dashboard/*`, cookie-based session (`@supabase/ssr`)
- [x] **Post-login home** — `/dashboard/home` rebuilt as 3-app workspace hub (see Phase 8 below)
- [x] **App-contextual tab navigation** — Replaces sidebar; horizontal `AppTabBar` renders the relevant tabs based on current route (Lab Metrics / Quality Management / Asset Management)
- [x] **Admin users** — Admins add users via **Admin → Users** (creates Supabase Auth user + `facility_users` row). Real **email required** for sign-in
- [x] Dashboard layout (top bar, app tab bar — sidebar removed in Phase 8)
- [x] Equipment API routes (CRUD), departments, scans
- [x] Dashboard KPI cards, charts (equipment status, daily scans, category donut, asset value)
- [x] QR code scanning (html5-qrcode)
- [x] PWA setup (@ducanh2912/next-pwa)
- [x] Multi-tenant foundation — facility_id migrations, facility_capability_profile, facility_users RBAC, audit_log, maintenance_schedule
- [x] Infrastructure — health/healthcheck endpoints, Sentry, PostHog, Upstash Redis, error boundaries
- [x] Phase 2: Equipment A/B/C, maintenance due, sync status
- [x] Phase 3: TAT module (test_requests, tat_targets, tat_breaches), LRIDS
- [x] Phase 4: Revenue module
- [x] Phase 5: Refrigerator monitoring (telemetry API)
- [x] Phase 6: QC module (Westgard, Levey-Jennings, Lab-hub import)
- [x] Phase 7: ModuleTile, operational_alerts, milestones
- [x] Tests module (volume vs target, charts)
- [x] Meta module (test metadata CRUD)
- [x] **Phase 8: UI/UX Redesign** *(completed 22 March 2026)* — see section below
- [x] **Phase 8b: Theme refinement & Login redesign** *(22 March 2026)* — neutral palette, split-layout login
- [x] **Phase 8c: Lab-hub QC features + Sample Management** *(22 March 2026)* — QC Calculator, QC Stats, Sample Management tab with Lab-hub integration
- [x] **Phase 8d: Navigation & Design overhaul** *(22 March 2026)* — Sidebar restored (white/slate, collapsible), login re-coloured (forest green), QC tabs underline-style, homepage cards as full links, search moved to Assets page
- [x] **Phase 8e: Medicare theme, LRIDS hospital board, sidebar toggle** *(22 March 2026)* — Teal/cyan hero header on Assets Overview, KPI card cyan accent, LRIDS fully redesigned as a hospital display board, sidebar collapse button redesigned as a pill-tab
- [x] **Phase 8f: Homepage teal redesign + LRIDS fix** *(22 March 2026)* — Homepage hero banner + all three app cards converted to unified teal/cyan palette; LRIDS font sizes normalised and layout fixed to work within dashboard wrapper
- [x] **Phase 9: Brand identity, sidebar redesign, Samples module** *(22 March 2026)* — see section below
- [x] **Phase 10: AI Intelligence Layer** *(22 March 2026)* — see section below
- [x] **Phase 11: Chart.js migration, module tabs, Quantitative QC, live alerts** *(22 March 2026)* — see section below

### Phase 9 — Brand Identity, Sidebar, Samples, LRIDS (22 March 2026)

- [x] **Brand green theme** — CSS variables (`--brand`, `--brand-dark`, etc.) derived from the login forest-green palette applied throughout. Active sidebar items, buttons and accents all use `#059669`/`#065f46`.
- [x] **Medicare-style sidebar** — Dark green gradient background (`#042f2e` → `#065f46` → `#047857`), white icon-only collapsed mode, white-pill active state, smooth 300ms transition. New nav items: LRIDS, Samples, Performance, QC sub-items (L-J, Westgard, Qualitative, Quantitative, QC Stats).
- [x] **Header redesign** — Hospital name + logo (from `NEXT_PUBLIC_HOSPITAL_NAME` / `NEXT_PUBLIC_HOSPITAL_LOGO_URL` env vars) shown on the left. Standalone Log Out button removed. Username shows first name only with initials avatar (Pro: photo avatar from user metadata). Clicking the user opens a dropdown with Settings, Brand (Pro), and Log Out.
- [x] **Alerts bell wired up** — Clicking the bell opens a slide-in panel with operational alerts, unread count badge, mark-all-read, and per-alert dismiss.
- [x] **"Lab Hub" renamed to "Samples"** — QC tab label updated; standalone `/dashboard/samples` page created.
- [x] **Samples module migrated to Supabase** — New migration `20260322000001_samples_module.sql` creates `lab_racks` + `lab_samples` tables with auto-status trigger. API routes: `/api/samples`, `/api/samples/stats`, `/api/samples/search`, `/api/samples/rack`. Full dashboard page at `/dashboard/samples` (Dashboard / Racks / Search sub-tabs). No localhost dependency.
- [x] **LRIDS waiting-area display** — `kanta/[facility]/lrids` fully redesigned as a full-screen hospital display board: hospital name + logo header, live clock, single two-column table (Patient Identifier + Status), most recent at top, auto-refresh every 30 s, no buttons/sidebar/nav.
- [x] **Dashboard LRIDS** — Manual refresh button removed; auto-refresh label kept.
- [x] **Brand Management page** (`/dashboard/settings/brand`) — Pro-gated page for logo upload, hospital name/tagline, primary/secondary colour pickers with live preview strip. Non-Pro users see a locked feature screen explaining what Pro unlocks.
- [x] **New env vars** — `NEXT_PUBLIC_PRO_FEATURES`, `NEXT_PUBLIC_HOSPITAL_NAME`, `NEXT_PUBLIC_HOSPITAL_LOGO_URL` added to `.env.example`. Default hospital name set to **Zyntel Hospital** in `.env.example`.

---

### Phase 10 — AI Intelligence Layer (22 March 2026)

- [x] **TAT Anomaly Detection** — Rolling 90-day baseline per section × test type stored in `tat_anomaly_baselines`. Every TAT event scored with a Z-score. Events exceeding ±2 SD flagged in `tat_anomaly_flags`. Consecutive flags on the same section grouped as a cluster. Confidence score combines sample-size factor and Z magnitude. Plain-English reason generated rule-based (no AI cost). API: `GET /api/tat/anomalies` (live flags), `POST /api/tat/anomalies` (nightly baseline refresh). Displayed inline in `/dashboard/tat` via `AnomalyPanel` component — not in a separate AI section.
- [x] **Natural Language Dashboard Queries** — `POST /api/ai/query` accepts a plain-English question from a lab manager. System prompt scopes responses strictly to facility operational data (Class A only). Clinical/patient inference explicitly prohibited. Answers arrive via Anthropic Claude Haiku. Every call logged to `ai_inference_log`. `NLQueryBar` component embedded in the TopBar (desktop) and accessible from `/dashboard/intelligence`.
- [x] **Weekly Operational Summaries** — `POST /api/ai/weekly-summary` generates a Markdown summary (top anomalies, volume by section, week-over-week delta, items requiring attention). Stored in `weekly_summaries` table. Delivered via Resend email when `email_recipients` provided. In-app reading at `/dashboard/intelligence`. Vercel Cron triggers every Monday at 07:00 UTC via `/api/cron/weekly-summary`.
- [x] **Predictive Fault Signal Infrastructure** — `equipment_telemetry_log` table created. Records TAT, Z-score, hour-of-day, day-of-week, sample volume per day. `days_to_failure` and `failure_type` columns left nullable — filled retroactively when equipment failure is recorded. Minimum 12–18 months across 3+ facilities required before model training begins.
- [x] **AI Inference Audit Log** — `ai_inference_log` table records every AI call: model, feature, data sources (table names only, no values), row count referenced, SHA-256 hash of output, latency, error. 24-month retention. Compliance evidence for ISO 15189 and regional data protection frameworks.
- [x] **Legal Architecture** — `docs/legal/DATA_CLASSIFICATION.md` defines Class A (operational, permitted in AI), Class B (patient-adjacent, never in AI), and Class C (facility-identifying, hashed before training). `docs/legal/TOS_CLAUSE_AI_TRAINING.md` provides the draft Section 8 clause: opt-in consent for data flywheel, anonymisation standard, audit trail disclosure, no-clinical-use boundary. `DATA_FLYWHEEL_ENABLED` and `FACILITY_HASH_SALT` env vars added to `.env.example`.
- [x] **Sidebar — Intelligence entry** — "AI Insights" (`Brain` icon) added under new "Intelligence" nav group, linking to `/dashboard/intelligence`.
- [x] **Supabase migration** — `20260322000002_ai_intelligence.sql` creates: `tat_anomaly_baselines`, `tat_anomaly_flags`, `weekly_summaries`, `ai_inference_log`, `equipment_telemetry_log`. All tables have RLS enabled.
- [x] **Vercel Cron** — `vercel.json` updated: `/api/cron/weekly-summary` runs Mondays 07:00 UTC; `/api/tat/anomalies` (baseline refresh) runs nightly 02:00 UTC.

### Phase 11 — Chart.js, Module Tabs, Quantitative QC, Live Alerts (22 March 2026)

- [x] **Chart.js installed** — `chart.js@4.5.1`, `react-chartjs-2@5.3.1`, `chartjs-plugin-datalabels@2.2.0` added to `package.json` and `node_modules`. `components/charts/registry.ts` registers all chart types and disables datalabels globally (enable per-dataset).
- [x] **TAT page migrated to Chart.js** — Recharts `PieChart` replaced by Chart.js `Doughnut` with `layout.padding: 28` so percentage labels never clip. Recharts `LineChart` ×2 replaced by Chart.js `Line` with filled area for on-time trend, consistent emerald/red/slate brand colours. Manual refresh button removed; 30s auto-refresh retained.
- [x] **TAT data label cutoff fixed** — `layout.padding: 28` on the Doughnut, `anchor:"center"`, `clip: false` on datalabels plugin. Percentage labels always readable inside the donut slices.
- [x] **ModuleTabBar component** — `components/dashboard/ModuleTabBar.tsx` — reusable horizontal tab strip with emerald underline active state, scroll-overflow on mobile, icon support, exact/prefix matching.
- [x] **Module tabs added to all Lab Metrics pages** — TAT, Tests, Numbers, Revenue, Performance pages each show a `ModuleTabBar` at the top linking across all Lab Metrics modules. Easier navigation when sidebar is collapsed.
- [x] **Quantitative QC tab** — `components/qc/QuantitativeQCTab.tsx` fully implemented:
  - Run entry form: date, value, operator, notes — saves to `qc_results` with `result_type = "quantitative"`
  - Live z-score preview while typing the value, with "will trigger 1-3S" warning
  - Westgard rule checking: 1-2S, 1-3S, 2-2S, 4-1S, 10-X computed client-side
  - Chart.js Line chart (Levey-Jennings style) with Mean, ±1SD, ±2SD, ±3SD reference lines in dashed colours (blue/amber/red)
  - Data points coloured by status: emerald (pass), amber (warning), red (reject)
  - Stats row: Mean, SD, CV%, Run count, Min, Max
  - Run log table sorted newest first with colour-coded rows
  - QC module tab bar updated to include "Quantitative QC" as 5th tab
- [x] **Supabase-backed alerts** — Mock alerts array removed from `TopBar.tsx`. `GET /api/alerts` fetches from `operational_alerts` table. `PATCH /api/alerts` acknowledges individual or all alerts. TopBar polls every 60 seconds. Dismiss/mark-all-read calls API and updates DB.

### What Is In Progress

- [ ] JWT `facility_id` claim + RLS tied to `auth.uid()` (currently DEFAULT_FACILITY_ID in several API paths)
- [ ] Offline-first PWA sync
- [ ] Vercel env vars for `development` preview environment — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` must be added to the **Preview** environment in Vercel dashboard (production env vars are already set and working)

### What Is Planned (Next Up)

- [ ] First paying hospital on equipment module
- [ ] Chart.js migration — remaining pages: Tests, Numbers, Revenue, Analytics, Performance, Home (Charts are still Recharts on those pages)
- [ ] Brand Management — Supabase Storage logo upload + `facility_branding` table persistence
- [x] TAT Performance card data label cutoff fix — resolved with Chart.js `layout.padding` + `clip: false`
- [x] Module-level horizontal tabs — implemented on all Lab Metrics pages
- [x] Quantitative QC tab — complete with Levey-Jennings chart + ±SD reference lines + Westgard rules
- [x] Supabase-backed alerts — live from `operational_alerts` table
- [ ] AI: Wire `days_to_failure` labels into `equipment_telemetry_log` on equipment failure events
- [ ] AI: Enrich anomaly reasons with Anthropic for higher-severity flags (z > 3.5)
- [ ] AI: Facility 2 onboarding — confirm `DATA_FLYWHEEL_ENABLED` opt-in before signing up second customer

---

## Phase 8f — Homepage Teal Redesign + LRIDS Fix (22 March 2026)

### Changes Made
| Area | Before | After |
|------|--------|-------|
| **Homepage hero** | Plain text heading (`Welcome to Kanta`) | Teal/cyan gradient banner with Kanta logo, "System Online" chip, module count |
| **App cards accent** | Indigo (Lab Metrics) · Emerald (QC) · Orange (Assets) | Unified teal/cyan palette — all cards use `border-cyan-400`, `border-sky-400`, `border-teal-400` with matching icon gradients |
| **App card border** | Thin `border border-slate-200` | `border-2` with colour-matched accent border — much more prominent and clickable |
| **Card CTA hover** | `text-slate-700` on hover | `text-cyan-600` on hover — matches theme |
| **"Offline-capable" tag** | Green (#059669) | Teal/cyan (#0891b2) — consistent palette |
| **LRIDS layout** | `min-h-screen` with own full-page background | Contained within dashboard layout — standard page header + stat cards + dark display board card |
| **LRIDS fonts** | `text-4xl` lab numbers, `text-2xl` stats, `text-3xl` clock | `text-base` lab numbers, `text-2xl` stat figures, `text-lg` clock — proportional and clean |
| **LRIDS stat row** | Dark-background `StatPill` components inside board header | White `border` stat cards above the board — Total / Ready / In Progress with icons |

### Files Changed (Phase 8f)
| File | Change |
|------|--------|
| `app/dashboard/home/page.tsx` | Full redesign — teal/cyan hero banner, all three app cards unified to teal palette (`cyan` / `sky` / `teal` variants), `border-2` accent borders, hover CTA turns cyan |
| `app/dashboard/lrids/page.tsx` | Layout fixed — removed `min-h-screen` full-page approach; page now has standard dashboard header + 3 stat cards + dark display board card; all fonts normalised |

---

## Phase 8e — Medicare Theme, LRIDS Board & Sidebar Toggle (22 March 2026)

### Changes Made
| Area | Before | After |
|------|--------|-------|
| **Assets Overview header** | Plain text heading + flat buttons | Teal/cyan gradient hero banner (`#0e7490 → #06b6d4`) with breadcrumb label, white CTA |
| **KPI cards** | Indigo "Equipment Scanned" card | Cyan/sky (`from-cyan-500 to-sky-600`) — matches Medicare dashboard palette |
| **AssetsSearchBar** | Default slate style only | Added `variant="light"` for rendering inside teal hero header (white/translucent) |
| **Section dividers** | Slate dot + slate gradient line | Cyan dot + cyan-tinted gradient line |
| **LRIDS (`/dashboard/lrids`)** | Basic dark table, single list | Full hospital display board — two-column layout (Ready / In Progress), live clock, stats pills, auto-refresh countdown, navy-teal gradient background |
| **Sidebar collapse button** | Tiny 24px circle on sidebar edge | Pill-shaped vertical tab (`w-5 h-14`) extending from sidebar right edge, turns cyan on hover |

### LRIDS Hospital Display Board
`/dashboard/lrids` now renders as a professional patient-facing display board:

| Feature | Detail |
|---------|--------|
| **Header** | FlaskConical icon + teal glow, "Laboratory Report Information Display" title |
| **Live clock** | Large digital time (hh:mm:ss AM/PM) + full date, updates every second |
| **Stats pills** | Total Results · Ready for Collection · In Progress counts with icons |
| **Refresh countdown** | Live "Refreshing in Xs" counter (30 s cycle) |
| **Two-column layout** | "Ready for Collection" (emerald) | "In Progress" (amber) — side by side on xl screens |
| **Result rows** | Large monospace lab number, test name, section, animated status badge (CheckCircle / spinning Loader) |
| **Background** | Dark navy-teal gradient (`#0f172a → #0c4a6e → #164e63`) |
| **Footer** | System name + last-updated timestamp |

### Files Changed (Phase 8e)
| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Replaced plain page header with teal/cyan gradient hero banner; updated `SectionDivider` with cyan dot |
| `app/dashboard/lrids/page.tsx` | Full rewrite — hospital display board (LiveClock, StatPill, ResultRow, RefreshCountdown components) |
| `components/dashboard/KpiCards.tsx` | `indigo` card theme changed from `from-indigo-500 to-violet-600` to `from-cyan-500 to-sky-600` |
| `components/dashboard/AssetsSearchBar.tsx` | Added `variant` prop (`"default"` \| `"light"`) for teal-header glass style |
| `components/dashboard/Sidebar.tsx` | Collapse toggle redesigned: small circle → vertical pill tab extending from sidebar right edge |

---

## Phase 8d — Navigation & Design Overhaul (22 March 2026)

### Changes Made
| Area | Before | After |
|------|--------|-------|
| **Sidebar** | Removed (Phase 8) | Restored — white/slate palette, collapsible, no indigo |
| **AppTabBar** | Global tab bar below TopBar | Removed — sidebar handles all navigation |
| **QC tabs** | Pill-tabs (2 levels: AppTabBar + internal) | Single underline tab bar, Lab-hub style |
| **Login panel** | Dark indigo gradient | Deep forest green gradient (`#042f2e → #065f46`) |
| **Homepage cards** | Div with CTA button | Full `<Link>` — whole card is clickable |
| **Search bar** | TopBar (global) | Assets Overview page only |
| **Kanta accent** | Indigo/violet throughout | Removed — slate-900 primary, emerald QC accent |

### Sidebar Design
- **Background:** `bg-white` with `border-r border-slate-200`
- **Active item:** `bg-slate-900 text-white` (no indigo)
- **Hover:** `bg-slate-100 text-slate-900`
- **Group labels:** `text-slate-400` uppercase tracking
- **Collapse toggle:** `−3px` floating button on the right edge, persists to `localStorage`
- **Width:** `220px` expanded · `60px` collapsed (icon-only mode)

### Files Changed (Phase 8d)
| File | Change |
|------|--------|
| `components/dashboard/Sidebar.tsx` | Full rewrite — white/slate, no indigo, cleaner icon-only collapsed mode |
| `app/dashboard/layout.tsx` | Restored `<Sidebar />`, removed `<AppTabBar />`, flex-row layout |
| `app/dashboard/qc/page.tsx` | Tab bar replaced with underline style (border-b-2, Lab-hub aesthetic) |
| `app/login/LoginForm.tsx` | Left panel changed from dark indigo to deep forest green |
| `app/dashboard/home/page.tsx` | Cards wrapped in `<Link>`, removed CTA button, cleaned indigo references |
| `components/dashboard/TopBar.tsx` | Removed search bar input + Command icon import |
| `app/dashboard/page.tsx` | Added `<AssetsSearchBar />` to page header |
| `components/dashboard/AssetsSearchBar.tsx` | **New** — standalone search input for Assets section |

---

## Phase 8c — Lab-hub QC Integration & Sample Management (22 March 2026)

### QC Module Expanded to 7 Tabs
`/dashboard/qc` now has a full 7-tab interface:

| Tab | Source | Description |
|-----|--------|-------------|
| **Overview** | Kanta | Active materials, recent Westgard violations |
| **L-J Chart** | Kanta | Levey-Jennings chart with mean/SD annotations |
| **Westgard** | Kanta | Full violations table with rule badges |
| **Qualitative QC** | Kanta | Qualitative test configs & entries, submit workflow |
| **QC Calculator** | Lab-hub | Enter up to 25 values → mean, SD, CV% (localStorage persisted) |
| **QC Stats** | Lab-hub | Date-range filtered run statistics (count/mean/SD/min/max) + run table |
| **Sample Mgmt** | Lab-hub | Full sample management connected to Lab-hub backend |

### Sample Management Tab — Lab-hub Integration
The Sample Mgmt tab (`SamplesTab` component) connects directly to the Lab-hub backend API:

**Sub-tabs:**
- **Dashboard** — Stats cards (total racks, samples, partial, pending discard) + recent racks list with progress bars
- **Racks** — Filterable rack list by date range & status; create new rack (name / date / type / description); delete rack; CSV export
- **Search** — Search samples by barcode, patient ID, or all fields; results show barcode, patient ID, type, position, collection date, notes with active/discarded badges

**Connection:**
- Configurable Lab-hub URL stored in `localStorage` (key: `kanta-lab-hub-url`)
- Connection banner shows live status (connected / unreachable) with Configure and Retry buttons
- Settings modal to enter custom Lab-hub base URL (e.g. `http://192.168.1.10:8000`)
- "View in Lab-hub ↗" links open the full rack detail page in Lab-hub UI

### Files Changed (Phase 8c)

| File | Change |
|------|--------|
| `app/dashboard/qc/page.tsx` | Added 7th tab `samples`, `SamplesTab` component, helper types (Rack, SampleResult, LabHubStats), connection logic, sub-tab UI |
| `components/dashboard/AppTabBar.tsx` | Added "Sample Mgmt" as 7th tab in Quality Management app config |

---

## Phase 8 — UI/UX Redesign (22 March 2026)

### Design Direction
Inspired by **Typeform** typography and the **Medicare Dashboard** (Dribbble) aesthetic:
- **Font:** Inter (300–800 weights) via `next/font/google` — tight tracking, large bold headings
- **Background:** Smooth lavender → white → periwinkle gradient (`#f5f3ff → #fff → #eff6ff`)
- **Cards:** Clean white with subtle shadows, coloured gradient accents

### Homepage — 3-App Workspace Model
`/dashboard/home` rebuilt from a flat grid of 12 tiles into **3 hero app cards**:

| App | Accent | Tabs |
|-----|--------|------|
| **Lab Metrics** | Indigo → Violet | TAT · Tests · Numbers · Meta · Revenue |
| **Quality Management** | Emerald → Teal | QC Overview · L-J Chart · Westgard · Qualitative QC · Calculator · QC Stats · Sample Mgmt |
| **Asset Management** | Amber → Orange | Assets Overview · Scan · Equipment · Maintenance · Refrigerator · Analytics · Reports |

### Navigation — Sidebar Removed
The full sidebar is replaced by a context-aware **AppTabBar** (`components/dashboard/AppTabBar.tsx`):
- Renders as a slim horizontal pill-tab bar below the TopBar
- Automatically shows the correct app's tabs based on the current pathname
- Includes a ← Home link and app badge on every app page
- Hidden on `/dashboard/home` and system pages (Admin, Settings, etc.)

### Scoped Components
- **Live Feed (TickerBar)** — moved from global layout to Assets Overview page only (`/dashboard`)
- **Add Equipment FAB** — moved from global layout to Assets Overview page only
- **Quick Access links** — removed from homepage (navigation now lives in the tab bars)
- **TopBar** — sidebar toggle controls removed (no sidebar)

### Files Changed

| File | Change |
|------|--------|
| `app/layout.tsx` | Added Inter font via `next/font/google` |
| `app/globals.css` | Typeform typography utilities, neutral warm-white background, animations |
| `app/dashboard/layout.tsx` | Removed Sidebar/TickerBar/FAB; added AppTabBar; neutral background |
| `app/dashboard/home/page.tsx` | Full redesign — 3 app cards, softened palette, removed quick links |
| `app/dashboard/page.tsx` | Added scoped TickerBar + FAB |
| `components/dashboard/AppTabBar.tsx` | **New** — context-aware horizontal tab navigation |
| `components/dashboard/Sidebar.tsx` | Nav groups restructured to 3-app model (retained for reference) |
| `components/dashboard/TopBar.tsx` | Removed sidebar toggle controls |
| `app/login/page.tsx` | Light loading fallback |
| `app/login/LoginForm.tsx` | **Full redesign** — split layout (dark brand panel + light form panel) |

---

## Phase 8b — Theme Refinement & Login Redesign (22 March 2026)

### Theme Changes
- **Background:** Switched from purple-tinted (`#f5f3ff`) to clean neutral slate-white (`#f8fafc → #fff → #f1f5f9`) — easier on the eyes, more clinical/professional
- **Card gradients:** Removed via/multi-stop gradients in favour of single-direction two-stop gradients (e.g. `from-indigo-500 to-indigo-700`) — less saturated, more refined
- **Tab bar:** Solid `bg-white` border-b instead of blurred glass — simpler and cleaner
- **Accent colours:** Dialled back saturation across Lab Metrics (indigo), Quality Mgmt (emerald), Asset Mgmt (orange)

### Login Page — Full Redesign
Replaced the dark glassmorphism card with a **split-screen layout**:

| Side | Content |
|------|---------|
| **Left (hidden mobile)** | Dark deep-indigo panel with Kanta brand, hero heading, 3 feature bullets (Lab Intelligence, Quality Management, Asset Management), subtle radial glow decorations |
| **Right** | Clean `#f8fafc` background, Inter-typed form card — email, password with inline "Forgot password?" link, indigo CTA with spinner state, error inline display |

- Inputs: white background, `border-slate-200`, indigo focus ring — clear and accessible
- Submit button: solid `bg-indigo-600` with `ArrowRight` icon, loading spinner replaces text
- Mobile: left panel hidden, brand shown inline above form instead

### Files Changed (Phase 8b)

| File | Change |
|------|--------|
| `app/globals.css` | Neutral CSS variables, softer gradient utilities |
| `app/dashboard/layout.tsx` | Updated background gradient to neutral slate |
| `app/dashboard/home/page.tsx` | Softened card gradients and blob colours |
| `components/dashboard/AppTabBar.tsx` | Solid white bar, cleaner active states |
| `app/login/page.tsx` | Light loading fallback |
| `app/login/LoginForm.tsx` | Full split-layout redesign |

---

## Stack & Infrastructure

| Layer | Technology | Environment |
|-------|------------|-------------|
| Frontend | Next.js 16 + TypeScript | Vercel |
| Backend | Next.js API Routes | Vercel |
| Database | Supabase PostgreSQL | Kanta project |
| Cache | Upstash Redis | Upstash |
| Font | Inter via next/font/google | — |
| Monitoring | Sentry, PostHog | — |

---

## Environment Status

| Environment | URL | Branch | Status |
|-------------|-----|--------|--------|
| Production | app.zyntel.net | `main` | Deployed — Phase 8 live |
| Preview | app-preview.zyntel.net | `development` | Deployed — needs Supabase env vars added for Preview environment |
| Local dev | http://localhost:3000 | any | Standard |

---

## Active Issues / Blockers

| Issue | Status | Notes |
|-------|--------|-------|
| Invalid supabaseUrl on development preview | Open | Env vars not set for Preview environment in Vercel. Go to Vercel → Settings → Environment Variables → tick **Preview** for each Supabase/Redis var, then redeploy. Production (`main`) is unaffected. |
| Invalid supabaseUrl (general) | Fixed | Env vars may have quotes — code sanitizes. Set values in Vercel without surrounding quotes. |
| Redis URL invalid | Fixed | Same quote-stripping applied to Redis env vars. |

---

## Key Decisions Made

| Decision | Outcome | Date |
|----------|---------|------|
| Lab-first launch | Laboratory is department one; radiology, pharmacy follow | March 2026 |
| Repo structure | kanta — standalone Next.js | — |
| Env var handling | Sanitize quotes from Vercel env vars in lib/supabase.ts and lib/redis.ts | March 2026 |
| User provisioning | No public self-signup; **admins** add users in Admin panel (Auth + facility_users) | March 2026 |
| Default after login | `/dashboard/home` (3-app workspace hub); deep links unchanged | March 2026 |
| Navigation model | Sidebar replaced by contextual horizontal AppTabBar per app domain | March 2026 |
| Font | Inter (next/font/google) — Typeform-style tight tracking, variable weights | March 2026 |
| Homepage structure | 3 hero app cards (Lab Metrics / Quality Mgmt / Asset Mgmt) replace flat module grid | March 2026 |

---

## Branch State

| Branch | Purpose | Last commit | Status |
|--------|---------|-------------|--------|
| `main` | Production | Phase 10 — AI Intelligence Layer | Live on Vercel |
| `development` | Integration/Preview | Phase 10 — in sync with main | Live on Vercel (needs Preview env vars) |
| `staging` | Staging | Mirrors main | March 2026 |

---

## How to Run This Project Locally

```bash
git clone git@github.com:zyntel-co-ltd/kanta.git
cd kanta

npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Fill in UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

npm run dev
```

Open **http://localhost:3000** → redirects to `/dashboard/home` when logged in, or `/login` when not.

---

## Vercel Environment Variables

Set these in Vercel **without surrounding quotes** — for **both Production and Preview** environments:

- `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://xxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL` — e.g. `https://xxx.upstash.io`
- `UPSTASH_REDIS_REST_TOKEN`

**Phase 10 — AI Intelligence additions:**

- `ANTHROPIC_API_KEY` — Required for NL queries and weekly summaries
- `NEXT_PUBLIC_APP_URL` — e.g. `https://app.zyntel.net` (used by cron jobs)
- `CRON_SECRET` — Random string to protect `/api/cron/*` endpoints
- `DATA_FLYWHEEL_ENABLED` — `false` until customer opts in to ToS Section 8
- `FACILITY_HASH_SALT` — Random 32-char string; rotate annually

---

## Cursor Context (Read Before Writing Any Code)

- **Base branch:** `main` (or `development` for features)
- **Navigation model:** Collapsible white sidebar (`components/dashboard/Sidebar.tsx`) handles all navigation. AppTabBar removed. Homepage (`/dashboard/home`) is the app selector — clicking a card navigates to the first page of that app.
- **3 app domains:**
  - **Lab Metrics** → `/dashboard/tat`, `/dashboard/tests`, `/dashboard/numbers`, `/dashboard/meta`, `/dashboard/revenue`
  - **Quality Management** → `/dashboard/qc`
  - **Asset Management** → `/dashboard`, `/dashboard/scan`, `/dashboard/equipment`, `/dashboard/maintenance`, `/dashboard/refrigerator`, `/dashboard/analytics`, `/dashboard/reports`
- **Key files:**
  - `app/dashboard/home/page.tsx` — 3-app workspace hub (homepage)
  - `app/dashboard/page.tsx` — Assets Overview (KPIs / charts / TickerBar / FAB)
  - `components/dashboard/AppTabBar.tsx` — Context-aware horizontal tab navigation
  - `components/dashboard/TopBar.tsx` — Top bar (search, sync status, user)
  - `lib/SidebarLayoutContext.tsx` — Retained for TopBar compatibility
  - `lib/AuthContext.tsx` — Client auth state
  - `lib/supabase.ts` — Admin client; `lib/supabase/client.ts` — browser session
  - `lib/redis.ts` — Redis client (sanitizes env quotes)
  - `supabase/migrations/` — Database migrations
- **Do not touch:** Supabase schema without a migration file
- **Code style:** TypeScript strict — see `.cursor/rules/`

---

*For management overview, see: [knowledge/zyntel-playbook/06-operations/projects-status.md](../../knowledge/zyntel-playbook/06-operations/projects-status.md)*
