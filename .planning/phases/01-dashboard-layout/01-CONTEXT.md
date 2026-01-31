# Phase 1: Dashboard Layout & Controls - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the foundational analytics dashboard structure: a new navigation entry point, responsive layout skeleton with time range controls, and CSV export functionality. This phase establishes the container and control mechanisms that all later analytics phases (usage cards, trends, driver rankings, insights) will fill with content.

</domain>

<decisions>
## Implementation Decisions

### Navigation & Access
- New tab in sidebar (not separate page, not dashboard subsection)
- Tab label: Chart icon (BarChart from Lucide React)
- Position: After Dashboard (second tab in nav order)
- Access: ADMIN and FOREMAN roles only (drivers excluded)

### Time Range Selector Design
- UI pattern: Button group / segmented control with 3 buttons (7 days | 30 days | 90 days)
- Labels: Preset name + actual date range (e.g., "7 days" with "Jan 24 - Jan 31" subtitle)
- Updates: Immediate change with loading indicator (no Apply button)
- Default: 30 days when first opened

### Export Report Behavior
- Scope: Export only currently visible/filtered data (respects time range and any filters)
- Filename: `logishift-analytics-[30d]-2025-01-31.csv` format (includes preset in name)
- Interaction: Button shows loading state during generation, then triggers download
- Button appearance: Icon + text ("Download" icon + "Export" label)

### Layout Grid Structure
- Desktop: 2-column layout with top controls bar
- Controls arrangement: Time range selector left, Export button right
- Content area: Responsive grid (2 columns on smaller desktops, 3 columns on large screens)
- Mobile: Single-column stack (all content vertical)

### Claude's Discretion
- Exact spacing between controls and content
- Mobile breakpoint thresholds
- Loading indicator design for time range changes
- Toast notification placement if needed for export confirmation

</decisions>

<specifics>
## Specific Ideas

- Analytics should feel like a first-class citizen in the app — hence placing it as second tab after Dashboard
- Time range preset + actual dates helps users understand exactly what period they're viewing
- Export respects current view so users get exactly what they see — no surprises
- Responsive grid adapts to screen real estate — use space efficiently on larger screens

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-dashboard-layout*
*Context gathered: 2026-01-31*
