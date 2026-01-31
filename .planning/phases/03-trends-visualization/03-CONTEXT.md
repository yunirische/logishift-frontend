# Phase 3: Trends Visualization - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

## Phase Boundary

Display time-series bar charts showing shifts, hours worked, and salary paid over daily intervals. Users toggle between metrics via tab bar, interact with bars to see exact values in tooltips, and chart updates reflect the selected time range filter (7/30/90 days). Data fetching from `/api/v1/analytics/trends` endpoint and responsive chart rendering are the core capabilities.

## Implementation Decisions

### Chart type & behavior
- **Bar chart** (not line, not toggleable)
- **Sharp corners** on bars (industrial aesthetic, cleaner)
- **Bars start from zero** on y-axis (not auto-scaled)
- **Animated** with subtle gradient fill under bars, 300ms transition on data/metric changes
- Modern, smooth feel when switching time ranges or metrics

### Metric switching controls
- **Tab bar** control (not dropdown, not icon buttons)
- **Positioned above the chart** (not in header, not below)
- **Full-width tabs** that stretch to fill container (modern, easy to tap)
- **Single metric view** (one metric visible at a time, no overlays or stacking)
- Consistent pattern with time range selector

### Axes & data density
- **Short date format** on x-axis: 'Jan 15' or '1/15' (compact, fits more labels)
- **Auto label spacing** — Recharts decides how many labels to show based on width
- **Abbreviated y-axis values** with K suffix: '15K', '2.5K', '500' (common analytics pattern)
- **Show horizontal grid lines** behind bars for easier value reading
- Balance between information density and readability

### Tooltip interactions
- **Minimal content**: Date + metric value + units (no percent change or comparisons)
- **Styled card tooltip** with rounded corners, subtle shadow (not default Recharts)
- **Long date format** in tooltip: 'January 15, 2026' (clearer, no ambiguity)
- **Smart precision**: No decimals for counts/hours, 2 decimals for salary
- Clean, focused information presentation

### Claude's Discretion
- Exact gradient fill opacity and colors
- Grid line styling (dashed vs solid, opacity)
- Tooltip positioning algorithm (Recharts default vs custom)
- Tab bar active state animation
- Loading skeleton design for chart area
- Error state handling within chart card

## Specific Ideas

- Bar chart chosen for easier day-to-day comparison and more modern, distinctive aesthetic
- Full-width tabs preferred for mobile touch-friendliness
- Smart precision on values avoids unnecessary decimals while showing salary cents accurately
- Grid lines help users read approximate values before hovering
- Long date format in tooltip provides clarity since short format on axes is for space

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 03-trends-visualization*
*Context gathered: 2026-01-31*
