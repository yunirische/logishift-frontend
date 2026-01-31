# Roadmap: LogiShift Frontend

## Overview

The v1.5 Analytics Dashboard milestone transforms LogiShift from operational shift management to data-driven insights. We're building comprehensive analytics that help admins and foremen understand resource utilization (trucks, drivers, sites), track trends over time (shifts, hours, costs), identify top performers, and receive actionable optimization recommendations. The journey starts with foundational layout and time range controls, progresses through incremental data visualization components (usage cards → trends charts → driver rankings → insights), and concludes with robust error handling and polished industrial styling that matches the existing design system.

## Milestones

- ✅ **v1.0 Core Functionality** - Completed 2025 (prior to GSD tracking)
- ✅ **v1.4 Audit Trail** - Completed 2026-01-27
- 🚧 **v1.5 Analytics Dashboard** - Phases 1-7 (in progress)

## Phases

### 🚧 v1.5 Analytics Dashboard (In Progress)

**Milestone Goal:** Build comprehensive analytics dashboard with usage visualization, trends, driver performance ranking, and optimization insights.

#### Phase 1: Dashboard Layout & Controls
**Goal**: Users can access analytics dashboard with responsive layout and time range filtering
**Depends on**: Nothing (first phase)
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05
**Success Criteria** (what must be TRUE):
  1. User can navigate to analytics page and see time range selector (7/30/90 days) at top of dashboard
  2. User can change time range preset and all analytics components update to reflect selected period
  3. User can click "Export Report" button to download CSV file of analytics data
  4. Dashboard displays in single-column layout on mobile devices and multi-column card layout on desktop
  5. All interactive elements (time range selector, export button) are touch-friendly and accessible on mobile
**Plans**: 1 plan in 1 wave

Plans:
- [x] 01-01: Analytics page with navigation entry, responsive layout, time range controls, and CSV export

**Completed:** 2026-01-31

#### Phase 2: Usage Overview Cards
**Goal**: Users can view resource utilization metrics for trucks, drivers, and sites
**Depends on**: Phase 1 (layout foundation)
**Requirements**: ANAL-06, ANAL-07, ANAL-08, ANAL-09, ANAL-10
**Success Criteria** (what must be TRUE):
  1. User can view three resource usage cards (trucks, drivers, sites) showing current count vs limit
  2. Usage cards display visual progress bar representing utilization percentage
  3. System displays "∞" symbol for unlimited resources (when limit is -1 or percent is null)
  4. Usage cards show color-coded indicators (green < 70%, yellow 70-90%, red > 90%)
  5. Usage card data updates when user changes time range filter
**Plans**: 1 plan in 1 wave

Plans:
- [x] 02-01: Usage cards with progress bars, color coding, and unlimited resource display

**Completed:** 2026-01-31

#### Phase 3: Trends Visualization
**Goal**: Users can view time-series charts showing shifts, hours worked, and salary paid over time
**Depends on**: Phase 2 (usage cards provide context, charts add depth)
**Requirements**: ANAL-11, ANAL-12, ANAL-13, ANAL-14, ANAL-15
**Success Criteria** (what must be TRUE):
  1. User can view line or bar chart displaying daily data for selected time range
  2. Chart shows date labels on x-axis and metric values on y-axis
  3. User can toggle between metrics (shifts count, hours worked, salary paid)
  4. Chart updates to reflect selected time range filter (7/30/90 days)
  5. Chart is interactive with tooltips showing exact values on hover
**Plans**: 1 plan in 1 wave

Plans:
- [x] 03-01: Trends chart with bar visualization, metric tabs, and API integration

**Completed:** 2026-01-31

#### Phase 4: Driver Performance
**Goal**: Users can view ranked list of top drivers by hours worked
**Depends on**: Phase 3 (trends show what, driver rankings show who)
**Requirements**: ANAL-16, ANAL-17, ANAL-18, ANAL-19, ANAL-20
**Success Criteria** (what must be TRUE):
  1. User can view ranked list of drivers sorted by hours worked (highest first)
  2. Driver list displays driver name, shifts count, hours worked, and salary paid
  3. List shows configurable number of top drivers (default: 10)
  4. List updates when user changes time range filter
  5. List is scrollable on mobile with sticky header for column labels
**Plans**: 1 plan in 1 wave

Plans:
- [x] 04-01: Driver rankings table with sortable columns, medal icons, and API integration

**Completed:** 2026-01-31

#### Phase 5: Insights Panel
**Goal**: Users can view optimization recommendations and resource warnings
**Depends on**: Phase 4 (driver rankings identify performers, insights identify opportunities)
**Requirements**: ANAL-21, ANAL-22, ANAL-23, ANAL-24, ANAL-25, ANAL-26
**Success Criteria** (what must be TRUE):
  1. User can view insights panel with underutilized resources list (trucks, sites with low usage)
  2. Insights panel displays near-limit resources with current/limit/percent (warnings for resources approaching limits)
  3. Panel shows cost per shift metric
  4. Panel displays recommended actions list (e.g., "Reduce truck count", "Upgrade plan")
  5. Insights use alert styling (warnings in yellow/orange, info in blue)
  6. Insights data updates when user changes time range filter
**Plans**: TBD

Plans:
- [ ] 05-01: Create insights panel component with alert styling
- [ ] 05-02: Fetch insights data from /api/v1/analytics/insights endpoint
- [ ] 05-03: Implement underutilized resources display
- [ ] 05-04: Implement near-limit resources warnings
- [ ] 05-05: Add cost per shift metric and recommended actions

#### Phase 6: Error Handling & Loading
**Goal**: Analytics dashboard handles errors gracefully and provides clear loading states
**Depends on**: Phase 5 (all data components complete, now ensure reliability)
**Requirements**: ANAL-27, ANAL-28, ANAL-29, ANAL-30
**Success Criteria** (what must be TRUE):
  1. User sees loading state or skeleton components while analytics data is being fetched
  2. When subscription is expired (403 error), dashboard displays read-only message explaining subscription status
  3. When analytics endpoints fail, dashboard displays error message with description of what went wrong
  4. User can click retry button or refresh to retry failed data requests
**Plans**: TBD

Plans:
- [ ] 06-01: Create loading skeleton components for each analytics section
- [ ] 06-02: Implement error boundary for analytics page
- [ ] 06-03: Handle subscription-expired (403) errors with read-only message
- [ ] 06-04: Add retry logic and refresh button for failed requests

#### Phase 7: Styling & Theming
**Goal**: Analytics dashboard matches existing LogiShift design system with industrial aesthetic
**Depends on**: Phase 6 (functionality complete, final polish)
**Requirements**: ANAL-31, ANAL-32, ANAL-33, ANAL-34
**Success Criteria** (what must be TRUE):
  1. All chart labels, axes, and tooltips use JetBrains Mono font family
  2. Chart lines and bars use Navy/Indigo color palette (indigo-600 to indigo-900)
  3. Dashboard maintains consistent spacing with rounded-3xl cards matching existing design system
  4. All controls and indicators use Lucide React icons consistent with existing patterns
**Plans**: TBD

Plans:
- [ ] 07-01: Apply JetBrains Mono font to all chart elements
- [ ] 07-02: Configure Navy/Indigo color palette for Recharts visualizations
- [ ] 07-03: Ensure consistent spacing and rounded-3xl card styling across all components
- [ ] 07-04: Add Lucide React icons to controls and indicators

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Dashboard Layout & Controls | v1.5 | 1/1 | ✓ Complete | 2026-01-31 |
| 2. Usage Overview Cards | v1.5 | 1/1 | ✓ Complete | 2026-01-31 |
| 3. Trends Visualization | v1.5 | 1/1 | ✓ Complete | 2026-01-31 |
| 4. Driver Performance | v1.5 | 1/1 | ✓ Complete | 2026-01-31 |
| 5. Insights Panel | v1.5 | 0/TBD | Not started | - |
| 6. Error Handling & Loading | v1.5 | 0/TBD | Not started | - |
| 7. Styling & Theming | v1.5 | 0/TBD | Not started | - |
