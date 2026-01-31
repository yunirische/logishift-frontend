# Requirements: LogiShift Frontend v1.5 Analytics Dashboard

**Defined:** 2026-01-31
**Core Value:** Drivers can start, track, and complete shifts with photo documentation, while admins/foremen have real-time visibility into fleet operations, resource utilization, and business insights.

## v1.5 Requirements

Requirements for Analytics Dashboard milestone. Each maps to roadmap phases.

### Dashboard Layout & Controls

- [ ] **ANAL-01**: User can select time range preset (7, 30, 90 days) via global filter at top of dashboard
- [ ] **ANAL-02**: Dashboard applies selected time range to all analytics components via days query parameter
- [ ] **ANAL-03**: User can click "Export Report" button to download CSV from `/api/v1/analytics/export`
- [ ] **ANAL-04**: Dashboard displays in single-column layout on mobile, multi-column cards on desktop
- [ ] **ANAL-05**: Charts are touch-friendly (zoomable, pannable, or sized for mobile interaction)

### Usage Overview Cards

- [x] **ANAL-06**: User can view resource usage cards for trucks, drivers, and sites
- [x] **ANAL-07**: Usage cards display current count vs limit (e.g., "8 / 10")
- [x] **ANAL-08**: Usage cards show progress bar for utilization percent
- [x] **ANAL-09**: System displays "∞" for unlimited resources (limit: -1, percent: null)
- [x] **ANAL-10**: Usage cards color-code based on utilization (green < 70%, yellow 70-90%, red > 90%)

### Trends Visualization

- [ ] **ANAL-11**: User can view time-series chart showing shifts count, hours worked, and salary paid over time
- [ ] **ANAL-12**: Chart uses line or bar visualization via Recharts library
- [ ] **ANAL-13**: Chart displays daily aggregated data from `/api/v1/analytics/trends` endpoint
- [ ] **ANAL-14**: Chart updates to reflect selected time range filter (7/30/90 days)
- [ ] **ANAL-15**: Chart displays date on x-axis, with toggle for metrics (shifts/hours/salary)

### Driver Performance

- [ ] **ANAL-16**: User can view ranked list of top drivers by hours worked
- [ ] **ANAL-17**: Driver list displays driver name, shifts count, hours worked, salary paid
- [ ] **ANAL-18**: List is sorted by hours worked (highest first)
- [ ] **ANAL-19**: List uses configurable limit (default: top 10 drivers)
- [ ] **ANAL-20**: List updates to reflect selected time range filter (7/30/90 days)

### Insights Panel

- [ ] **ANAL-21**: User can view plan optimization insights and recommendations
- [ ] **ANAL-22**: Insights panel displays underutilized resources list (trucks, sites)
- [ ] **ANAL-23**: Insights panel displays near-limit resources with current/limit/percent
- [ ] **ANAL-24**: Insights panel displays cost per shift metric
- [ ] **ANAL-25**: Insights panel displays recommended actions list
- [ ] **ANAL-26**: System uses alert styling (warnings, info) for insights visualization

### Error Handling & Loading

- [ ] **ANAL-27**: Dashboard displays loading state/skeleton while fetching analytics data
- [ ] **ANAL-28**: Dashboard handles subscription-expired errors (403) gracefully with read-only message
- [ ] **ANAL-29**: Dashboard displays error message if analytics endpoints fail
- [ ] **ANAL-30**: System implements retry logic or refresh button for failed requests

### Styling & Theming

- [ ] **ANAL-31**: All chart labels, axes, and tooltips use JetBrains Mono font family
- [ ] **ANAL-32**: Chart lines and bars use Navy/Indigo color palette (matching Tailwind indigo-600 to indigo-900)
- [ ] **ANAL-33**: Dashboard maintains consistent spacing with rounded-3xl cards (existing design system)
- [ ] **ANAL-34**: Dashboard uses Lucide React icons for controls and indicators (matching existing patterns)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Analytics

- **ANAL-40**: User can compare time periods (week over week, month over month)
- **ANAL-41**: User can create custom date range picker (beyond presets)
- **ANAL-42**: Dashboard supports real-time analytics updates via polling or WebSocket
- **ANAL-43**: User can drill down into individual data points (click to see shifts for specific day)
- **ANAL-44**: Dashboard displays site-level analytics breakdown

### Export & Reporting

- **ANAL-50**: User can schedule automated email reports
- **ANAL-51**: User can export charts as images (PNG/SVG)
- **ANAL-52**: User can create custom report templates

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-tenant analytics comparison | Single tenant focus, cross-tenant analysis deferred to v2+ |
| Real-time data streaming | Adds complexity, manual refresh sufficient for v1.5 |
| Custom chart builder | Fixed chart views cover core needs, customization deferred |
| Advanced data filtering | Time range presets sufficient, complex filters deferred |
| Predictive analytics | Historical focus only, predictions deferred |
| Drill-down to individual shifts | Time constraints, navigation to shifts tab sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANAL-01 | Phase 1 | Complete |
| ANAL-02 | Phase 1 | Complete |
| ANAL-03 | Phase 1 | Complete |
| ANAL-04 | Phase 1 | Complete |
| ANAL-05 | Phase 1 | Complete |
| ANAL-06 | Phase 2 | Complete |
| ANAL-07 | Phase 2 | Complete |
| ANAL-08 | Phase 2 | Complete |
| ANAL-09 | Phase 2 | Complete |
| ANAL-10 | Phase 2 | Complete |
| ANAL-11 | Phase 3 | Pending |
| ANAL-12 | Phase 3 | Pending |
| ANAL-13 | Phase 3 | Pending |
| ANAL-14 | Phase 3 | Pending |
| ANAL-15 | Phase 3 | Pending |
| ANAL-16 | Phase 4 | Pending |
| ANAL-17 | Phase 4 | Pending |
| ANAL-18 | Phase 4 | Pending |
| ANAL-19 | Phase 4 | Pending |
| ANAL-20 | Phase 4 | Pending |
| ANAL-21 | Phase 5 | Pending |
| ANAL-22 | Phase 5 | Pending |
| ANAL-23 | Phase 5 | Pending |
| ANAL-24 | Phase 5 | Pending |
| ANAL-25 | Phase 5 | Pending |
| ANAL-26 | Phase 5 | Pending |
| ANAL-27 | Phase 6 | Pending |
| ANAL-28 | Phase 6 | Pending |
| ANAL-29 | Phase 6 | Pending |
| ANAL-30 | Phase 6 | Pending |
| ANAL-31 | Phase 7 | Pending |
| ANAL-32 | Phase 7 | Pending |
| ANAL-33 | Phase 7 | Pending |
| ANAL-34 | Phase 7 | Pending |

**Coverage:**
- v1.5 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
