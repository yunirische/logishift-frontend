---
phase: 05-insights-panel
plan: 01
subsystem: analytics
tags: [react, typescript, insights-panel, optimization-recommendations, alert-styling, cost-metrics]

# Dependency graph
requires:
  - phase: 04-driver-performance
    provides: analytics dashboard foundation with usage cards, trends chart, and driver rankings
provides:
  - Insights panel component with alert-based styling (amber, orange, blue, indigo)
  - Cost per shift metric with currency formatting
  - Underutilized resources detection (trucks, sites)
  - Near-limit warnings with progress bars
  - Recommended actions for plan optimization
affects: [06-export-csv]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Alert-based color coding for insights (amber=warning, orange=near-limit, blue=info, indigo=metric)
    - Responsive grid layout (1 col mobile, 2 col desktop)
    - Loading skeleton matching component structure
    - Empty state with contextual messaging

key-files:
  created:
    - src/components/analytics/InsightsPanel.tsx
  modified:
    - src/types.ts
    - src/constants.ts
    - src/services/api.ts
    - src/components/Analytics.tsx

key-decisions:
  - "Cost per shift card always visible (key metric, even when no issues)"
  - "Separate color schemes per insight type (amber/orange/blue/indigo) for visual clarity"
  - "Russian locale currency formatting (RUB, no decimals)"
  - "Loading skeleton matches actual component structure for better perceived performance"

patterns-established:
  - "Insight card pattern: icon + label + content in colored background"
  - "Near-limit display: current/limit/percent with progress bar"
  - "Resource tags: pill-shaped badges for underutilized items"

# Metrics
duration: 2min
completed: 2026-01-31
---

# Phase 05 Plan 01: Insights Panel Summary

**Analytics insights panel with cost per shift metric, underutilized resources detection, near-limit warnings, and actionable optimization recommendations with alert-based styling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-31T19:08:09Z
- **Completed:** 2026-01-31T19:10:23Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Built comprehensive insights panel displaying 4 types of analytics recommendations (cost metric, underutilized resources, near-limit warnings, optimization actions)
- Integrated alert-based color system (amber for underutilized, orange for near-limit, blue for recommendations, indigo for cost metric)
- Added time range reactivity so insights update when user changes 7/30/90 day preset
- Implemented robust loading, error, and empty states matching existing analytics components

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AnalyticsInsights Type and API Service** - `7a82973` (feat)
2. **Task 2: Create InsightsPanel Component with Alert Styling** - `9f0d3bf` (feat)
3. **Task 3: Integrate InsightsPanel into Analytics Dashboard** - `4f65226` (feat)

**Plan metadata:** None (will be created in final commit)

## Files Created/Modified

- `src/types.ts` - Added AnalyticsInsights and NearLimitResource interfaces
- `src/constants.ts` - Added ANALYTICS_INSIGHTS endpoint
- `src/services/api.ts` - Added getAnalyticsInsights() function with days parameter
- `src/components/analytics/InsightsPanel.tsx` - New component with cost metric, underutilized resources, near-limit warnings, and recommendations
- `src/components/Analytics.tsx` - Integrated InsightsPanel into dashboard grid (Row 4)

## Decisions Made

- **Cost per shift always visible:** Key business metric that's relevant even when no optimization opportunities exist
- **Alert color coding:** Amber for underutilized (warning), orange for near-limit (urgent), blue for recommendations (informational), indigo for cost metric (primary)
- **Russian locale formatting:** Currency displayed as "2 500 ₽" with no decimals for cleaner appearance
- **Responsive grid:** Single column on mobile, two columns on desktop for optimal space usage
- **Progressive enhancement:** Component shows partial data if some insight categories are empty

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Analytics suite now complete with:
- Usage cards (phase 02)
- Trends visualization (phase 03)
- Driver rankings (phase 04)
- Insights panel (phase 05)

Ready for Phase 06 (CSV Export) to add data export functionality to the analytics dashboard.

No blockers or concerns.

---
*Phase: 05-insights-panel*
*Completed: 2026-01-31*
