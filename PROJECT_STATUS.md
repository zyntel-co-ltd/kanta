# Kanta — Project Status

**Last updated:** 25 March 2026 (Phase 23 — Design system: tokens, charts, StatusBadge, accent unification)  
**Updated by:** Cursor

---

## Repo map (high-signal)

Generated from a `repomix --no-files` snapshot (paths only). **No secrets or file contents** are included here.

### Top-level

```text
.cursor/
.github/
app/
components/
lib/
prisma/
public/
scripts/
styles/
supabase/
types/
```

### Key entrypoints

```text
.env.example
next.config.ts
package.json
prisma/schema.prisma
PROJECT_STATUS.md
```

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
- [x] **Phase 12: Emerald theme, sidebar cutout, app cards, logout** *(22 March 2026)* — see section below
- [x] **Phase 13: Sidebar toggle fix, app cards simplified, TypeScript fix** *(22 March 2026)* — see section below
- [x] **Phase 14: Medtbank-style sidebar, green & white palette** *(23 March 2026)* — see section below
- [x] **Phase 15: Quality Management rebuilt from Lab-hub** *(23 March 2026)* — see section below
- [x] **Phase 16: Lab Metrics rebuilt from zyntel-dashboard** *(23 March 2026)* — see section below
- [x] **Phase 17: Lab Metrics top tabs + collapsible sidebar groups** *(23 March 2026)* — see section below
- [x] **Phase 18: Homepage UX improvements** *(23 March 2026)* — see section below
- [x] **Phase 19: Chart.js full migration — Recharts removed** *(25 March 2026)* — see section below
- [x] **Phase 20: Quality & samples hub + combined sidebar** *(26 March 2026)* — see section below
- [x] **Phase 21: ESLint cleanup + Lab Metrics icon refresh** *(27 March 2026)* — see section below
- [x] **Phase 22: RBAC v2, registration & invites, Zyntel default facility** *(27 March 2026)* — see section below
- [x] **Phase 23: Design system — tokens, Chart.js theme, StatusBadge, UI accent unification** *(25 March 2026)* — see section below

### Phase 23 — Design System: Tokens, Charts, StatusBadge, Accent Unification (25 March 2026)

#### Summary
Unified the **Kanta UI** around **emerald (brand) + slate (structure) + semantic status colours** (amber / red / blue for state, not decoration). Added shared **`lib/design-tokens.ts`** (BRAND, STATUS, STRUCTURE), **`lib/chart-theme.ts`** (`CHART_NEUTRAL`, `CHART_STATUS`, `CHART_AXIS`, `CHART_TAT`, `CHART_EQUIPMENT_STACK`, `CHART_BRAND_SECONDARY`), **`components/ui/StatusBadge`**, and **`components/charts/registry.ts`** global Chart.js defaults + tooltip plugin. **`app/globals.css`** documents the §1–§12 implementation map and adds `.kanta-card`, `.kanta-table-header`, `.kanta-text-status-*`. Replaced remaining **indigo / violet / teal / purple** Tailwind accents across auth, scan, and dashboard routes; aligned chart hex and demo data colours with tokens. **TAT**, **QC**, and **Performance** tables use **StatusBadge**; key charts import theme constants instead of hard-coded palette.

#### Key files
| File | Change |
|------|--------|
| `lib/design-tokens.ts` | **New** — BRAND / STATUS / STRUCTURE (+ BRAND.LIGHT, BRAND.MUTED) |
| `lib/chart-theme.ts` | **New** — chart series, TAT, equipment stack, axis, tooltip plugin |
| `components/ui/StatusBadge.tsx` | **New** — semantic `ok` / `warn` / `bad` / `info` / `neutral` |
| `components/charts/registry.ts` | Chart.js defaults + tooltip styling |
| `components/dashboard/DashboardChrome.tsx` | **New** — LRIDS / dashboard chrome |
| `app/globals.css` | §1–§12 comment block; structural/status utility classes |
| `app/dashboard/tat/page.tsx`, `qc/page.tsx`, `performance/page.tsx` | Tokens + StatusBadge where applicable |
| `components/dashboard/*Chart*.tsx`, `components/qc/LeveyJenningsChart.tsx` | Wired to `chart-theme` / `design-tokens` |

#### Verification
- `npm run type-check` — **passes**
- `npm run lint` — **passes** (existing `AuthContext` hooks warning may remain)

---

### Phase 22 — RBAC v2, Registration & Invites, Zyntel Default Facility (27 March 2026)

#### Summary
End-to-end **facility-scoped roles** with server enforcement, **platform super-admins**, **facility invites** (Resend when configured), **public facility registration**, and a single **default facility** documented as **Zyntel Hospital** (override via env).

#### Database (`supabase/migrations/20260325000000_kanta_rbac_roles_v2.sql`)
- **`facility_role`** migrated to: `facility_admin`, `lab_manager`, `lab_technician`, `viewer` (maps legacy `admin`/`manager`/`technician`/`reception`/`viewer`).
- **`platform_admins`** — cross-facility super admins (`user_id` only).
- **`facility_invites`** — email, role, token, expiry, acceptance tracking.

#### Auth & API
- **`lib/auth/roles.ts`** — `getPermissions`, role allowlists for admin vs revenue.
- **`lib/auth/server.ts`** — `getAuthContext()`, `requireAdminUserManagement()`, `requireRevenueAccess()`, optional `facilityIdHint` for POST bodies.
- **`GET /api/me`** — session + `facilityId`, `role`, `isSuperAdmin`, permission flags for the client.
- **`/api/admin/*`** — protected (facility admin / lab manager or platform super admin); **`DELETE /api/admin/users/:id`** returns **405** (deactivate only).
- **`GET /api/revenue`** — protected by revenue-capable roles.
- **`POST /api/auth/register-facility`** — creates `hospitals` + first `facility_admin`.
- **`POST /api/invites`** + **`POST /api/invites/accept`** — invite flow; **`resend`** dependency for email.

#### Client
- **`AuthContext`** — `facilityAuth` / `facilityAuthLoading` from `/api/me`.
- **`Sidebar`** — hides Revenue, Admin, Departments, and some write-only QC/Samples links by permission.
- **`/dashboard/admin`** — role labels updated; delete-user UI removed; access denied when not admin-capable.

#### Default facility (Zyntel Hospital)
- **`lib/constants.ts`** — `DEFAULT_FACILITY_ID` resolves **`NEXT_PUBLIC_DEFAULT_FACILITY_ID`** or fallback UUID documented as Zyntel Hospital.
- **`.env.example`** — `NEXT_PUBLIC_DEFAULT_FACILITY_ID` documented.
- **`/api/capability`**, **`/api/qc/import`**, **`app/kanta/[facility]/lrids`** — use shared constant instead of hardcoded UUID.
- **`/dashboard/home`** — shows **`NEXT_PUBLIC_HOSPITAL_NAME`** (default Zyntel Hospital) in the hero.

#### Verification
- `npm run type-check` — **passes**
- Apply the SQL migration on Supabase before relying on new tables/enums in production.

---

### Phase 21 — ESLint Cleanup + Lab Metrics Icon Refresh (27 March 2026)

#### Summary
CI-quality **ESLint** with **zero errors and zero warnings** (`eslint . --max-warnings 0` passes). Lab Metrics navigation uses a **consistent modern Lucide icon set** across tabs, sidebar, home pills, and quick actions.

#### ESLint
- **`eslint.config.mjs`** — `react-hooks/set-state-in-effect` **off** (common data-fetch / hydration patterns); **`@typescript-eslint/no-require-imports`** off for `next.config.ts` and `scripts/**/*.js`.
- **Fixes (examples):** `prefer-const`; removed unused imports/vars; `react/no-unescaped-entities` (HTML entities / curly quotes); **`useCallback`** for stable loaders (`equipment`, `maintenance`, `tracker`, **`TopBar`** `loadAlerts`); **`QRCodeDisplay`** uses **`next/image`** with **`unoptimized`** for data URLs; **`supabase/functions/anomaly-scan`** stub simplified; misc. API and lib cleanups.

#### Lab Metrics icons (Lucide)
| Item | Icon |
|------|------|
| Lab Metrics (sidebar parent) | `ChartColumnIncreasing` |
| TAT | `Timer` |
| Tests | `Microscope` |
| Numbers | `Binary` |
| Meta | `TableProperties` |
| Revenue | `CircleDollarSign` |
| Performance | `ChartSpline` |

**Files:** `LabMetricsTabs.tsx`, `Sidebar.tsx`, `AppTabBar.tsx` (also adds **Performance** tab + `/dashboard/performance` in `labPrefixes`), `home/page.tsx` pills, `QuickActions.tsx` (View TAT → `Timer`). Tab strip: slightly larger stroke / opacity tweak in `LabMetricsTabs`.

#### Verification
- `npm run type-check` — **passes**
- `npm run lint` — **passes** (0 errors, 0 warnings)
- `eslint . --max-warnings 0` — **passes**

---

### Phase 20 — Quality & Samples Hub + Combined Sidebar (26 March 2026)

#### Summary
Merged **Quality Management** and **Samples** into a single sidebar workspace: **“Quality & samples”**, with a dedicated **hub page** at `/dashboard/quality-samples` that links to the existing QC and Samples apps. `/dashboard/qc` and `/dashboard/samples` are unchanged; only navigation and entry points were unified.

#### Changes

**Hub page**
- **`app/dashboard/quality-samples/page.tsx`** — Server-rendered landing: hero strip + two cards (QC & compliance → `/dashboard/qc`; Sample management → `/dashboard/samples?tab=dashboard`).

**Sidebar**
- `components/dashboard/Sidebar.tsx` — Replaced separate “Quality Management” and “Samples” accordions with one collapsible group titled **Quality & samples**; parent href `parentHref: /dashboard/quality-samples`; `activePaths: [/dashboard/qc, /dashboard/samples]`.
- Sub-items use **section labels** (`QC` / `Samples`) via optional `section?: string` on `NavItem`.
- **Sub-link active state** — `useSearchParams` + `isSubLinkActive()` matches pathname and `?tab=`; if `tab` is omitted, defaults match app behaviour (`QC` → `config`, Samples → `dashboard`).
- Chevron `aria-label` uses `group.title` dynamically.

**Layout**
- `app/dashboard/layout.tsx` — `<Sidebar />` wrapped in **`<Suspense>`** (fallback aside placeholder) because `useSearchParams` is used in the sidebar.

**Home**
- `app/dashboard/home/page.tsx` — Third workspace card retitled **“Quality & samples”**; primary link to `/dashboard/quality-samples`; CTA **“Open workspace”**; pills: QC, Samples, Data entry.

**Recent visits**
- `lib/recentVisits.ts` — `PATH_LABELS["/dashboard/quality-samples"]` → **“Quality & samples”**.

#### Verification
- `npm run type-check` — **passes**
- `npm run build` — **passes**

#### Files changed

| File | Change |
|------|--------|
| `app/dashboard/quality-samples/page.tsx` | **New** — hub page |
| `app/dashboard/layout.tsx` | `Suspense` around `Sidebar` |
| `components/dashboard/Sidebar.tsx` | Merged group, sections, `isSubLinkActive`, `useSearchParams` |
| `app/dashboard/home/page.tsx` | Card → Quality & samples + hub href |
| `lib/recentVisits.ts` | Label for hub path |

---

### Phase 19 — Chart.js Full Migration, Recharts Removed (25 March 2026)

#### Summary
Standardized the entire dashboard on a single charting library — **Chart.js (`react-chartjs-2`)**. All remaining Recharts usage has been removed and `recharts` uninstalled from `package.json`. This eliminates the dual-library bundle weight (~38 packages removed), ensures consistent rendering behavior and theming across all chart types, and removes the maintenance overhead of keeping two charting APIs in sync.

#### What changed

**Dashboard component charts (shared)**
- `components/dashboard/DailyScanChart.tsx` — Recharts `BarChart` → Chart.js `Bar`
- `components/dashboard/CategoryDonut.tsx` — Recharts `PieChart/Pie/Cell` → Chart.js `Doughnut`; `cutout` moved to options, hover interaction via Chart.js `onHover` in options
- `components/dashboard/EquipmentStatusChart.tsx` — Recharts stacked `BarChart` → Chart.js stacked `Bar`
- `components/dashboard/AssetValueChart.tsx` — Recharts `AreaChart/Area` → Chart.js `Line` with `fill: true` datasets
- `components/dashboard/KpiCards.tsx` — Recharts `LineChart/Line` sparklines → Chart.js `Line` with no axes/legend

**Lab Metrics pages**
- `app/dashboard/tests/page.tsx` — daily volume bar + horizontal top-tests bar → Chart.js `Bar` (vertical + `indexAxis: "y"`)
- `app/dashboard/numbers/page.tsx` — daily + hourly request volume bars → Chart.js `Bar`
- `app/dashboard/revenue/page.tsx` — section doughnut + daily line + revenue-by-test horizontal bar → Chart.js `Doughnut`, `Line`, `Bar`
- `app/dashboard/performance/page.tsx` — tests-by-section + avg-TAT-by-section horizontal bars → Chart.js `Bar` with per-bar colors
- `app/dashboard/tat/page.tsx` — TAT distribution doughnut + daily multi-line + hourly stacked bar → Chart.js `Doughnut`, `Line`, `Bar`

**Quality Management**
- `app/dashboard/qc/page.tsx` — Levey-Jennings Recharts `LineChart` with `ReferenceLine` → Chart.js `Line`; SD bands replicated as flat-line datasets; point colors per Westgard status retained; tooltip filters to QC Value dataset only

#### Technical notes
- `cutout` is a `ChartOptions<"doughnut">` field, not a dataset field — moved correctly to `options` level on all doughnut charts
- `onHover` for CategoryDonut moved into `options.onHover` with proper `ActiveElement[]` typing (removed invalid `onHover` prop from `<Doughnut />`)
- All chart containers use explicit `h-[Npx]` div wrappers with `responsive: true, maintainAspectRatio: false` — no more `<ResponsiveContainer />`
- Tooltips use Chart.js `callbacks` pattern throughout; no custom Recharts JSX tooltip components
- `@/components/charts/registry` import added to every file that didn't already have it

#### Dependency changes
| Package | Before | After |
|---------|--------|-------|
| `recharts` | `^3.7.0` | **Removed** (`npm uninstall recharts`) |
| `chart.js` | `^4.5.1` | `^4.5.1` (unchanged) |
| `react-chartjs-2` | `^5.3.1` | `^5.3.1` (unchanged) |

#### Verification
- `npm run type-check` — **passes** (0 errors)
- `npm run build` — **passes** (all 90 pages generated successfully)
- Repo-wide `grep` for `from "recharts"` — **0 results**

#### Files changed

| File | Change |
|------|--------|
| `app/dashboard/tat/page.tsx` | Recharts → Chart.js (Doughnut + Line + stacked Bar) |
| `app/dashboard/tests/page.tsx` | Recharts → Chart.js (vertical Bar + horizontal Bar) |
| `app/dashboard/numbers/page.tsx` | Recharts → Chart.js (Bar ×2) |
| `app/dashboard/revenue/page.tsx` | Recharts → Chart.js (Doughnut + Line + horizontal Bar) |
| `app/dashboard/performance/page.tsx` | Recharts → Chart.js (horizontal Bar ×2 with per-bar colors) |
| `app/dashboard/qc/page.tsx` | Recharts Levey-Jennings → Chart.js Line with SD band datasets |
| `components/dashboard/DailyScanChart.tsx` | Recharts → Chart.js Bar |
| `components/dashboard/CategoryDonut.tsx` | Recharts → Chart.js Doughnut |
| `components/dashboard/EquipmentStatusChart.tsx` | Recharts → Chart.js stacked Bar |
| `components/dashboard/AssetValueChart.tsx` | Recharts → Chart.js Line (area fill) |
| `components/dashboard/KpiCards.tsx` | Recharts → Chart.js Line (sparklines) |
| `package.json` | `recharts` removed |
| `package-lock.json` | 38 packages removed |

---

### Phase 18 — Homepage UX Improvements (23 March 2026)

#### Summary
Six UX refinements to the dashboard home page (`/dashboard/home`): reduce sidebar redundancy, visual differentiation, clearer labels, simpler cards, primary action, and descriptive CTAs.

#### Changes

**1. Recently visited + Quick actions**
- **Recently visited** — Displays last 2–3 dashboard pages with relative timestamps ("2h ago", "Just now"). Uses `localStorage` via `lib/recentVisits.ts`. `RecentVisitsTracker` in dashboard layout records visits; `RecentlyVisited` component renders on home.
- **Quick actions** — Three prominent buttons: Scan equipment, View TAT, QC Data Entry. Gives users fast access without duplicating sidebar.

**2. Distinct card colors**
- **Lab Metrics** — Emerald gradient (unchanged)
- **Quality Management** — Indigo/purple gradient
- **Asset Management** — Teal gradient  
Each card has its own header gradient and CTA accent so workspaces are visually distinguishable.

**3. Concrete workspace label**
- Replaced vague "3 modules active" with "Lab Metrics · QC · Assets" in the hero strip.

**4. Pills on hover**
- Module pills (TAT, Tests, etc.) hidden by default on desktop; shown on card hover. Always visible on mobile (touch devices). Reduces visual clutter while keeping info available.

**5. Primary action**
- Added "Scan equipment" button in the hero banner (below subtitle). Links to `/dashboard/scan`. White button with emerald text and scan icon.

**6. Descriptive CTAs**
- Replaced generic "Open" with action-oriented labels per card:
  - Lab Metrics → "View metrics"
  - Quality Management → "Manage QC"
  - Asset Management → "View assets"

#### Files changed

| File | Change |
|------|--------|
| `lib/recentVisits.ts` | **New** — Track/render recent visits, format time ago |
| `components/dashboard/RecentVisitsTracker.tsx` | **New** — Records pathname to localStorage on dashboard navigation |
| `components/dashboard/RecentlyVisited.tsx` | **New** — Displays recently visited pages with timestamps |
| `components/dashboard/QuickActions.tsx` | **New** — Scan equipment, View TAT, QC Data Entry buttons |
| `app/dashboard/layout.tsx` | Added `<RecentVisitsTracker />` |
| `app/dashboard/home/page.tsx` | Hero primary CTA, Recently visited + Quick actions, distinct card gradients, ctaLabel per card, pills on hover, "Lab Metrics · QC · Assets" |

---

### Phase 17 — Lab Metrics Top Tabs + Collapsible Sidebar Groups (23 March 2026)

#### Summary
Three UX improvements to navigation consistency and sidebar cleanliness.

#### Changes

**Lab Metrics tab bar (all 6 pages)**
- New shared `components/dashboard/LabMetricsTabs.tsx` component — horizontal pill tab bar with TAT, Tests, Numbers, Meta, Revenue, and Performance tabs
- Active tab highlighted in emerald; inactive tabs show slate with hover state
- Injected as the first section (above the filter bar) on every Lab Metrics page so users can switch between metrics without touching the sidebar

**Sidebar — Lab Metrics now collapsible**
- "Lab Metrics" group converted to a collapsible accordion (same pattern as Quality Management and Samples)
- Parent row shows `BarChart3` icon; clicking navigates to `/dashboard/tat` and expands sub-items
- `activePaths` config ensures the group highlights and auto-expands when on any of the 6 metrics routes
- Sub-items (TAT, Tests, Numbers, Meta, Revenue, Performance) hidden until the accordion is open

**Sidebar — Asset Management now collapsible**
- "Asset Management" group converted to a collapsible accordion
- Parent row shows `ScanLine` icon; clicking navigates to `/dashboard/equipment`
- Sub-items (Overview, Scan, Equipment, Maintenance, Refrigerator, Analytics, Reports) hidden until the accordion is open
- Auto-expands when navigating to any Asset Management page

**Vercel build fix (same session)**
- Fixed TypeScript error: `app/api/samples/discarded/[id]/route.ts`, `racks/[id]/route.ts`, `racks/[id]/discard/route.ts`, and `sample/[id]/route.ts` had `Params = { params: { id: string } }` which Next.js 16 requires as `Promise<{ id: string }>`
- All 4 files updated; build now passes

#### Files changed

| File | Change |
|------|--------|
| `components/dashboard/LabMetricsTabs.tsx` | **New** — shared tab-bar component for all Lab Metrics pages |
| `components/dashboard/Sidebar.tsx` | Lab Metrics + Asset Management converted to collapsible accordions; `activePaths` added to collapsible type; `useEffect` updated to auto-expand for all metric and asset paths |
| `app/dashboard/tat/page.tsx` | `LabMetricsTabs` injected at top |
| `app/dashboard/tests/page.tsx` | `LabMetricsTabs` injected at top |
| `app/dashboard/numbers/page.tsx` | `LabMetricsTabs` injected at top |
| `app/dashboard/meta/page.tsx` | `LabMetricsTabs` injected at top |
| `app/dashboard/revenue/page.tsx` | `LabMetricsTabs` injected at top |
| `app/dashboard/performance/page.tsx` | `LabMetricsTabs` injected at top |
| `app/api/samples/discarded/[id]/route.ts` | `Params` type updated to `Promise<{id}>` for Next.js 16 |
| `app/api/samples/racks/[id]/route.ts` | `Params` type updated to `Promise<{id}>` for Next.js 16 |
| `app/api/samples/racks/[id]/discard/route.ts` | `Params` type updated to `Promise<{id}>` for Next.js 16 |
| `app/api/samples/sample/[id]/route.ts` | `Params` type updated to `Promise<{id}>` for Next.js 16 |

---

### Phase 16 — Lab Metrics Rebuilt from zyntel-dashboard (23 March 2026)

All 6 Lab Metrics pages were fully deleted and replaced with exact ports of the zyntel-dashboard UI, wired to Kanta's existing Supabase API routes, styled with Kanta's emerald theme.

#### Pages rebuilt

| Page | Route | Key changes |
|------|-------|-------------|
| **TAT** | `/dashboard/tat` | Zyntel layout: filter bar (period, shift, lab, dates), left sidebar with delayed/on-time progress bars + 5 KPI cards, right area with TAT distribution doughnut, daily trend line, hourly stacked bar |
| **Numbers** | `/dashboard/numbers` | Zyntel layout: target progress bar, avg daily / busiest hour / busiest day KPIs, daily request volume bar, hourly request volume bar |
| **Tests** | `/dashboard/tests` | Zyntel layout: total tests target progress, avg daily KPI, daily test volume trend, top tests by volume horizontal bar with per-section filter |
| **Revenue** | `/dashboard/revenue` | Zyntel layout: total revenue card (today / yesterday / same day last week), avg daily + cancellation rate KPIs, section revenue doughnut, daily revenue line, revenue by test horizontal bar |
| **Meta Table** | `/dashboard/meta` | Zyntel layout: full paginated CRUD table (test name, section badge, price, TAT), add/edit modal with custom section & TAT inputs, CSV export |
| **Performance** | `/dashboard/performance` | Zyntel layout: 4 KPI cards (resulted, received, avg TAT, breaches), completion rate progress bar, tests by section bar chart, avg TAT by section bar chart, by-section summary table with On/Over Target badges, recent TAT breaches table |

#### Technical notes

- All pages are `"use client"` Next.js App Router components
- Charts built with `recharts` (already in `package.json`) — PieChart/Pie (doughnut), LineChart, BarChart, horizontal BarChart
- All data fetched from existing Kanta Supabase API routes (`/api/tat/analytics`, `/api/numbers`, `/api/tests`, `/api/revenue`, `/api/performance`, `/api/meta`)
- Filter controls: period, shift, lab section, laboratory, test name, date range (page-appropriate subset)
- TypeScript compiles clean; no lint errors on any page
- Emerald color palette applied throughout (`emerald-500/600/700`, `slate-*`)

#### Files changed

| File | Change |
|------|--------|
| `app/dashboard/tat/page.tsx` | Complete rewrite — zyntel TAT layout with recharts |
| `app/dashboard/numbers/page.tsx` | Complete rewrite — zyntel Numbers layout with recharts |
| `app/dashboard/tests/page.tsx` | Complete rewrite — zyntel Tests layout with recharts |
| `app/dashboard/revenue/page.tsx` | Complete rewrite — zyntel Revenue layout with recharts |
| `app/dashboard/meta/page.tsx` | Complete rewrite — zyntel Meta table with full CRUD |
| `app/dashboard/performance/page.tsx` | Complete rewrite — zyntel Performance dashboard with TAT breaches |

---

### Phase 15 — Quality Management Rebuilt from Lab-hub (23 March 2026)

The entire `/dashboard/qc` Quality Management section was replaced with an exact port of the Lab-hub app's QC interface, styled with Kanta's emerald/slate theme.

#### What changed

- [x] **Complete page rewrite** — Previous Kanta QC page (7 tabs backed by Supabase API) fully deleted and replaced with Lab-hub QC content (8 tabs backed by Lab-hub backend)
- [x] **8-tab interface matching Lab-hub** — Tab bar mirrors Lab-hub's `QC.js` navigation exactly:
  - **QC Config** — Full config form (QC Name, Level, Lot #, Expiry, Mean, SD, Units) + live table with Enable / Disable / Edit / Delete actions
  - **Data Entry** — Entry form (config selector, units display, date, value) + Draft Entries table with Edit / Submit / Delete per row
  - **Visualization** — Dual Levey-Jennings charts via `recharts`; Westgard rule colouring (green/amber/red dots); dual-config overlay; date-range filter; `±1SD/2SD/3SD` reference lines
  - **QC Calculator** — 25-value Mean & SD calculator with CV%, ±1/2/3 SD ranges; results persisted to `localStorage`
  - **QC Stats** — Date-range filtered statistics summary (count, mean, SD, min, max) + submitted-values table with Mark Resolved and Delete; CSV export
  - **Qual. Config** — Full qualitative QC config form with test name, result type, frequency, manufacturer, lot number, expiry, and per-control levels/expected results table
  - **Qual. Entry** — Control-results entry with interactive Pass/Fail buttons; overall pass/fail banner; corrective-action textarea (required on any failure); Save Draft and Save & Submit workflow
  - **Qual. Log** — Stats summary cards (Total Runs / Passed / Failed / Pass Rate); filterable run history with expandable detail rows showing per-control concordance/discordance; CSV export
- [x] **Lab-hub API connection** — All QC data reads/writes go to Lab-hub backend (`/api/GetItems`, `/api/PostItems`, `/api/PutItem`, `/api/DeleteItem`) via configurable URL (stored in `localStorage` under `kanta-lab-hub-url`, same key as Samples tab)
- [x] **Connection banner** — Live connected/disconnected status with Configure and Retry buttons; Settings modal for Lab-hub URL
- [x] **Emerald theme applied** — All Lab-hub blue (`bg-blue-*`, `text-blue-*`, `border-blue-*`, `focus:ring-blue-*`) replaced with Kanta's emerald/slate palette throughout
- [x] **Dependencies adapted** — `dayjs` replaced with native Date methods; `xlsx` Excel export replaced with CSV download; `html2canvas`/`jspdf` PDF export removed (libraries not installed); `ConfirmModal` component inlined; `recharts` (already in `package.json`) used for charts; `FormContext` inlined with `useState`
- [x] **No TypeScript errors** — Full TypeScript port with `QcItem = Record<string, any>` for the flat Lab-hub data store; all components strongly typed

#### Files changed

| File | Change |
|------|--------|
| `app/dashboard/qc/page.tsx` | Complete rewrite — 1 729 lines; 8-tab Lab-hub QC interface with Kanta emerald theme |

### Phase 14 — Medtbank-Style Sidebar, Green & White (23 March 2026)

- [x] **Medtbank-inspired layout** — Pill-shaped active state with thin vertical gradient bar on the left edge; rounded sidebar corners (`0 28px 28px 0`); white circular collapse toggle with green chevron.
- [x] **Green & white color palette** — Sidebar background `#065f46`; emerald gradient for active bar (`#042f2e → #065f46 → #047857`); white logo box with green flask; white/light text; soft white overlay for active pill.
- [x] **Collapsed pop-out tooltips** — Hover/active items show gradient pill tooltip with label and triangular pointer on the right.
- [x] **Footer structure** — User profile (avatar, name) and logout; theme toggle removed.
- [x] **Home page icon type fix** — Extended `IconProps` to include `strokeWidth` for Vercel build.

### Phase 13 — Sidebar Toggle Fix & App Cards Simplified (22 March 2026)

- [x] **Sidebar toggle now always visible** — `overflow-hidden` on the `<aside>` was clipping the collapse button (positioned at `-right-4`). Fixed by setting `overflow-visible` on the aside and moving clipping to the inner logo (`overflow-hidden`) and nav (`overflow-x-hidden`) elements.
- [x] **Sidebar defaults to collapsed** — `useState(true)` so new users land on the green icon-only sidebar. Old localStorage key renamed from `kanta-sidebar-collapsed` to `kanta-sidebar-collapsed-v2` to reset any expanded state saved by previous visits.
- [x] **App cards redesigned (simpler)** — Removed decorative blob, top accent bar, icon scale animation, pill borders, and divider. New design: dark green gradient header band with icon + title, clean white body with description, flat module tags, and a minimal "Open →" CTA. Much cleaner and more professional.
- [x] **TypeScript build fix** — `NavItem` icon type extended to include `strokeWidth` and `style` props, fixing Vercel build error: `Property 'strokeWidth' does not exist on type`.

### Phase 12 — Emerald Theme, Sidebar Cutout, App Cards & Logout (22 March 2026)

- [x] **Unified emerald theme** — Dashboard theme switched from teal/cyan to login-page emerald (`#042f2e`, `#065f46`, `#047857`, `#6ee7b7`). Sidebar, TopBar info toasts, intelligence page, and homepage all use emerald palette.
- [x] **Sidebar cutout selection** — Collapsed sidebar uses green gradient background with white "cutout" pill for active item (inverted corner notches via pseudo-elements). Expanded sidebar remains white with emerald accents. Toggle logic and selection styling aligned with Medicare Dashboard reference.
- [x] **Homepage emerald** — Hero banner and app cards converted from teal/cyan to emerald. Hero gradient matches login (`#042f2e → #065f46 → #047857`). All three app cards use emerald accents (`border-emerald-400/500`, `bg-emerald-50`, `from-emerald-500 to-emerald-700`).
- [x] **App cards design polish** — Top accent bar (emerald gradient), decorative gradient blob (intensifies on hover), enhanced hover states (stronger shadow, emerald tint, lift), icon scale on hover, title colour shift, pill borders, divider before CTA, improved focus ring.
- [x] **Logout button refinement** — Better separation (`mt-2`), red-tinted hover states (expanded: `hover:bg-red-50`, `hover:border-red-100`; collapsed: `hover:bg-red-500/20`), left accent bar on hover (expanded), `aria-label` for accessibility, smoother transitions.

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
- [x] Chart.js migration — all pages migrated; Recharts removed (Phase 19, 25 March 2026)
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

*Note: Phase 12 later converted homepage from teal/cyan to emerald palette.*

### Changes Made
| Area | Before | After |
|------|--------|-------|
| **Homepage hero** | Plain text heading (`Welcome to Kanta`) | Teal/cyan gradient banner with Kanta logo, "System Online" chip, module count → *Phase 12: emerald gradient* |
| **App cards accent** | Indigo (Lab Metrics) · Emerald (QC) · Orange (Assets) | Unified teal/cyan palette — *Phase 12: emerald palette for all cards* |
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
| `main` | Production | Phase 23 — Design system (tokens, charts, StatusBadge) | Live on Vercel |
| `development` | Integration/Preview | Track `main` | Live on Vercel (needs Preview env vars) |
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
  - **Lab Metrics** → `/dashboard/tat`, `/dashboard/tests`, `/dashboard/numbers`, `/dashboard/meta`, `/dashboard/revenue`, `/dashboard/performance`
  - **Quality & samples** — Hub `/dashboard/quality-samples`; **QC** → `/dashboard/qc`; **Samples** → `/dashboard/samples`
  - **Asset Management** → `/dashboard`, `/dashboard/scan`, `/dashboard/equipment`, `/dashboard/maintenance`, `/dashboard/refrigerator`, `/dashboard/analytics`, `/dashboard/reports`
- **Key files:**
  - `app/dashboard/home/page.tsx` — 3-app workspace hub (homepage)
  - `app/dashboard/page.tsx` — Assets Overview (KPIs / charts / TickerBar / FAB)
  - `components/dashboard/LabMetricsTabs.tsx` — Shared tab bar for all 6 Lab Metrics pages
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
