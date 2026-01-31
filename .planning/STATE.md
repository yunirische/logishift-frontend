# LogiShift Frontend - State Management

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements for Milestone v1.5 Analytics Dashboard
Last activity: 2026-01-31 — Milestone v1.5 started

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-01-31)

**Core value:** Drivers can start, track, and complete shifts with photo documentation, while admins/foremen have real-time visibility into fleet operations, resource utilization, and business insights.

**Current focus:** Milestone v1.5 Analytics Dashboard

## Milestone History

### v1.5 - Analytics Dashboard (CURRENT)
**Started:** 2026-01-31
**Goal:** Build comprehensive analytics dashboard with usage visualization, trends, driver performance ranking, and optimization insights.
**Status:** Defining requirements

### v1.4 - Audit Trail Enhancements
**Completed:** 2026-01-27
**Shipped:**
- Audit log viewing with formatted descriptions
- Action and entity_type handling
- Date grouping and icons
- Null safety improvements

### v1.0 - Core Functionality
**Completed:** 2025 (prior to GSD tracking)
**Shipped:**
- Driver shift workflow (state machine)
- Photo uploads (odometer/invoice)
- Admin dashboard (shifts, fleet, sites, users)
- Authentication and authorization
- PWA configuration

## Accumulated Context

### Decisions Made (from PROJECT.md)

1. **Recharts for visualizations** — Chosen for declarative API, good time-series support
2. **Separate Analytics page/tab** — Keep accessible but not clutter main dashboard
3. **Progressive enhancement** — Usage cards first, then charts
4. **Caching strategy** — 5-15 min cache to reduce API load

### Technical Patterns (from codebase mapping)

**Component Structure:**
- Role-based rendering (DRIVER vs ADMIN/FOREMAN)
- Mobile-first responsive design
- AuthContext for global auth state
- Custom hooks for data fetching (pattern exists)

**API Layer:**
- Centralized `api.ts` with helper methods (get, post, patch, del)
- 30-second timeout on requests
- Auto-logout on 401 responses
- `getPhotoUrl()` for normalizing photo paths

**Styling:**
- TailwindCSS with custom design tokens
- Indigo/slate color palette
- Rounded-3xl cards for modern look
- Lucide React icons (replaced emoji for Chrome compatibility)

### Known Constraints

- Backend v2.5 analytics endpoints documented but not yet integrated
- Subscription middleware allows GET requests when expired (important for error handling)
- All analytics endpoints filter by tenant_id from JWT
- CSV export exists on backend, UI not needed for v1.5

### Blockers

None currently identified.

### Pending Work

**Current Phase: Requirements Definition**
- Define detailed requirements for 6 analytics features
- Determine exact UI layout and component structure
- Plan integration with existing tab navigation
- Specify error handling for subscription-expired scenarios

**Next:** Create REQUIREMENTS.md after scoping all features

## Metrics

- **Codebase files mapped:** ✓ Complete (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.)
- **GSD initialization:** ✓ Complete
- **Milestone v1.5:** ○ In Progress
- **Requirements definition:** ○ Pending
- **Roadmap creation:** ○ Pending
