# LogiShift Frontend

## What This Is

LogiShift is a Progressive Web App (PWA) for logistics/driver shift management. Built with React + TypeScript + Vite, it connects to a backend API at `https://pwa.kontrolsmen.ru/api/v1`. The app serves two distinct user groups: Admin/Foreman (dashboard, fleet management, analytics) and Drivers (state-machine based shift workflow with photo uploads).

## Core Value

Drivers can start, track, and complete shifts with photo documentation, while admins/foremen have real-time visibility into fleet operations, resource utilization, and business insights.

## Current Milestone: v1.5 Analytics Dashboard

**Goal:** Build comprehensive analytics dashboard with usage visualization, trends, driver performance ranking, and optimization insights.

**Target features:**
- Usage overview cards (resource utilization vs plan limits)
- Trends visualization (time-series charts for shifts, hours, salary)
- Driver performance ranking (top drivers by hours worked)
- Plan optimization insights panel (recommendations and warnings)

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

### Active

<!-- Current scope. Building toward these. -->

- [ ] **ANAL-01**: User can view resource usage vs plan limits (trucks, drivers, sites)
- [ ] **ANAL-02**: User can view trends chart (shifts count, hours worked, salary paid over time)
- [ ] **ANAL-03**: User can view top drivers ranking by hours worked
- [ ] **ANAL-04**: User can view plan optimization insights and recommendations
- [ ] **ANAL-05**: User can filter analytics by date range (days parameter)
- [ ] **ANAL-06**: Dashboard handles subscription-expired errors gracefully

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

**Known Issues:**
- No current analytics visualization
- Subscription-expired error handling needs implementation for analytics
- Date range filtering needs UI component

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
| Recharts for visualizations | Already used in ecosystem, declarative API, good docs, supports time-series | ✓ Good |
| Separate Analytics page/tab | Keep analytics accessible but not clutter main dashboard | — Pending |
| Usage cards first, then charts | Progressive enhancement, core metrics before visualization | — Pending |
| Cache analytics data 5-15 min | Reduce API load, analytics not real-time critical | — Pending |

---
*Last updated: 2026-01-31 after Milestone v1.5 kickoff*
