# LogiShift Frontend

## What This Is

LogiShift is a Progressive Web App (PWA) for logistics/driver shift management. Built with React + TypeScript + Vite, it connects to a backend API at `https://pwa.kontrolsmen.ru/api/v1`. The app serves two distinct user groups: Admin/Foreman (dashboard, fleet management, analytics) and Drivers (state-machine based shift workflow with photo uploads).

## Core Value

Drivers can start, track, and complete shifts with photo documentation, while admins/foremen have real-time visibility into fleet operations, resource utilization, and business insights.

## Current Milestone: v2.5 Stabilization & Audit

**Goal:** System-wide audit and fix of core regressions across driver UI, state machine, modal history, and exports.

**Target areas:**
- State Machine & Driver UI (unified interface, real-time sync)
- Shift Modal Logic (history/comments data mapping)
- Dashboard Analytics & Quotas (stats discrepancies)
- Export System (file format/corruption issues)

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ **AUTH-01**: JWT authentication with 12-hour token expiration — v1.0
- ✓ **AUTH-02**: Role-based access control (DRIVER, FOREMAN, ADMIN) — v1.0
- ✓ **SHIFT-01**: Driver can start shift with truck and site selection — v1.0
- ✓ **SHIFT-02**: Driver can upload odometer photo (before work) — v1.0
- ✓ **SHIFT-03**: Driver can end shift and upload odometer photo (after work) — v1.0
- ✓ **SHIFT-04**: Driver can upload invoice photo — v1.0
- ✓ **SHIFT-05**: Shift state machine transitions (idle → awaiting_odo_start → active → awaiting_odo_end → awaiting_invoice → finished) — v1.0
- ✓ **DASH-01**: Admin dashboard shows active shifts and fleet status — v1.0
- ✓ **FLEET-01**: Admin can manage trucks (CRUD operations) — v1.0
- ✓ **SITE-01**: Admin can manage work sites (CRUD operations) — v1.0
- ✓ **USER-01**: Admin can manage drivers (CRUD operations) — v1.0
- ✓ **SHIFT-06**: Admin can manually create shifts — v1.0
- ✓ **AUDIT-01**: Admin can view audit log entries — v1.4
- ✓ **AUDIT-02**: Audit logs display formatted descriptions with icons — v1.4
- ✓ **ANAL-01**: User can select time range preset (7/30/90 days) via global filter — v1.5
- ✓ **ANAL-02**: Dashboard applies selected time range to all components — v1.5
- ✓ **ANAL-03**: User can click Export Report button to download CSV — v1.5
- ✓ **ANAL-04**: Dashboard displays in responsive layout (mobile single-column, desktop multi-column) — v1.5
- ✓ **ANAL-05**: Charts are touch-friendly with 44px minimum targets — v1.5
- ✓ **ANAL-06**: User can view resource usage cards for trucks, drivers, sites — v1.5
- ✓ **ANAL-07**: Usage cards display current count vs limit — v1.5
- ✓ **ANAL-08**: Usage cards show progress bar for utilization percent — v1.5
- ✓ **ANAL-09**: System displays "∞" for unlimited resources — v1.5
- ✓ **ANAL-10**: Usage cards color-code based on utilization (green/yellow/red) — v1.5
- ✓ **ANAL-11**: User can view time-series chart showing shifts, hours, salary — v1.5
- ✓ **ANAL-12**: Chart uses bar visualization via Recharts library — v1.5
- ✓ **ANAL-13**: Chart displays daily data from /api/v1/analytics/trends — v1.5
- ✓ **ANAL-14**: Chart updates to reflect selected time range — v1.5
- ✓ **ANAL-15**: Chart displays date on x-axis with metric toggle — v1.5
- ✓ **ANAL-16**: User can view ranked list of top drivers by hours worked — v1.5
- ✓ **ANAL-17**: Driver list displays name, shifts, hours, salary — v1.5
- ✓ **ANAL-18**: List is sorted by hours worked (highest first) — v1.5
- ✓ **ANAL-19**: List uses configurable limit (default: top 10) — v1.5
- ✓ **ANAL-20**: List updates to reflect selected time range — v1.5
- ✓ **ANAL-21**: User can view plan optimization insights and recommendations — v1.5
- ✓ **ANAL-22**: Insights panel displays underutilized resources — v1.5
- ✓ **ANAL-23**: Insights panel displays near-limit resources — v1.5
- ✓ **ANAL-24**: Insights panel displays cost per shift metric — v1.5
- ✓ **ANAL-25**: Insights panel displays recommended actions — v1.5
- ✓ **ANAL-26**: System uses alert styling for insights — v1.5
- ✓ **ANAL-27**: Dashboard displays loading skeletons while fetching — v1.5
- ✓ **ANAL-28**: Dashboard handles subscription-expired errors (403) gracefully — v1.5
- ✓ **ANAL-29**: Dashboard displays error message if endpoints fail — v1.5
- ✓ **ANAL-30**: System implements retry logic and refresh button — v1.5
- ✓ **ANAL-31**: All chart labels, axes, tooltips use JetBrains Mono — v1.5
- ✓ **ANAL-32**: Chart bars use Navy/Indigo color palette — v1.5
- ✓ **ANAL-33**: Dashboard maintains consistent spacing with rounded-3xl cards — v1.5
- ✓ **ANAL-34**: Dashboard uses Lucide React icons throughout — v1.5

### Active

<!-- Current scope. Building toward these. -->

Requirements TBD - Defining v2.5 scope (phased approach: critical fixes first)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Payment processing** — Subscription payments handled outside PWA (Telegram bot/external)
- **Real-time analytics updates** — Adds complexity, manual refresh sufficient for v1.5
- **Custom report builder** — Fixed analytics views cover core use cases, custom builder deferred
- **Data export functionality** — Backend CSV export endpoint exists, UI not needed for v1.5
- **Multi-tenant analytics comparison** — Single tenant focus, comparison features deferred

## Context

**Technical Environment:**
- React 18 with TypeScript
- Vite for build tooling and PWA configuration
- TailwindCSS for styling with custom design system (indigo/slate)
- Lucide React for icons
- D3.js already in dependencies (for future use), will add Recharts for analytics

**Prior Work:**
- Comprehensive codebase mapping completed (`.planning/codebase/`)
- Backend v2.5 analytics endpoints documented (8 endpoints: usage, trends, drivers, summary, insights, shifts, sites, export)
- Audit trail implementation completed (v1.4)
- Documentation synced with logishift-docs repository

**Backend Integration:**
- Backend v2.5 Phase 4 analytics endpoints available (`/api/v1/analytics/*`)
- All endpoints require JWT authentication and filter by tenant_id
- Subscription middleware (checkSubscription) allows GET requests even when subscription expired
- CSV export available via backend, UTF-8 BOM for Excel compatibility

**Known Issues (v2.5 Audit Targets):**

**State Machine & Driver UI (High Priority):**
- Critical: "Start Shift" triggers toast but doesn't update UI to 'Active' state (Timer/Finish button missing)
- Critical: Demo Driver mode (Tenant 999) doesn't show real driver interface or shift history
- Requirement: Unify DriverView across all roles with real-time state sync

**Shift Modal Logic (Data Integrity):**
- High: "History" and "Comments" tabs empty in EditShiftModal
- Requirement: Verify API integration with GET /api/v1/audit/shift/:id and data mapping

**Dashboard Analytics & Quotas:**
- High: Discrepancy in stats - real account shows "0" active shifts when they exist
- Requirement: Audit data mapping in Dashboard.tsx against current Backend API response

**Export System:**
- High: Exported shift file corrupted or formatted incorrectly
- Requirement: Fix Blob handling and headers in api.ts for clean Excel/CSV output

**Legacy Issues:**
- Minor: Double API fetching on time range changes (optimization opportunity)
- Medium: DriverRankings empty state time range shortcuts not wired (CustomEvents)
- Minor: Unused globalError state (cleanup needed)

## Constraints

- **Tech Stack**: React + TypeScript + Vite + TailwindCSS — Existing stack, proven patterns
- **Charting**: Recharts — Already chosen, declarative API, good for time-series data
- **PWA Requirements**: Offline support, app installability — Must maintain PWA functionality
- **Mobile-First**: Responsive design critical (drivers use mobile, admins use desktop/tablet)
- **Performance**: Analytics queries should complete within 5 seconds, implement caching strategy

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Recharts for visualizations | Already used in ecosystem, declarative API, good docs, supports time-series | ✓ Good - v1.5 |
| Separate Analytics page/tab | Keep analytics accessible but not clutter main dashboard | ✓ Good - v1.5 |
| Usage cards first, then charts | Progressive enhancement, core metrics before visualization | ✓ Good - v1.5 |
| Analytics as second tab after Dashboard | High visibility for admins/foremen | ✓ Good - v1.5 |
| Time range presets (7/30/90 days) | Simple UI covers core use cases | ✓ Good - v1.5 |
| JetBrains Mono for chart typography | Matches industrial aesthetic, numeric clarity | ✓ Good - v1.5 |
| 403 without auth clear | Read-only analytics for expired subscriptions | ✓ Good - v1.5 |

---
*Last updated: 2026-02-12 after v2.5 milestone initiation*
