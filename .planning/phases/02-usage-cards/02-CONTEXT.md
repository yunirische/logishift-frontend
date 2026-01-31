# Phase 2: Usage Overview Cards - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

## Phase Boundary

Display resource utilization metrics for trucks, drivers, and sites with visual progress indicators. Users see three cards showing current count vs limit with color-coded status. Interactive features (clicking cards for details, drill-down views) are separate phases.

## Implementation Decisions

### Card Layout & Density
- Responsive grid layout: 3 columns on desktop, 2 on tablet, 1 on mobile
- Full detail card content: icon, title (Trucks/Drivers/Sites), count/limit, progress bar, percentage, utilization label
- Count/limit dominant: Big count/limit numbers, medium percentage, medium progress bar
- Visual hierarchy emphasizes actual resource usage

### Progress Visualization
- Thin progress bars (4-8px) with subtle rounding (rounded-lg corners)
- Smooth CSS transition (0.3-0.5s ease) when percentage changes
- Percentage displayed as separate text aligned with count/limit (not overlaid on bar)

### Unlimited Resource Display
- Muted infinity symbol (∞) with 60% opacity when limit is null/-1
- Show "5 / ∞" format matching limited cards (consistency)
- Hide progress bar completely for unlimited resources (no bar shown)
- Neutral gray color for unlimited resource cards (informational, not status)

### Color Threshold Behavior
- Hard switch at thresholds: green < 70%, yellow 70-90%, red > 90%
- Include lower bound: ≥70% is yellow, ≥90% is red
- Colors apply to progress bar fill + percentage text (not full card)
- Subtle pulse animation on red progress bars (>90% utilization) for emphasis

### Claude's Discretion
- Exact spacing and typography within cards
- Icon choice for each resource type (truck, user, building/map pin)
- Exact hex shades for green/yellow/red thresholds (within indigo/slate design system)
- Card container styling — choose what matches Phase 1 controls best

## Specific Ideas

- Responsive grid should match existing design patterns from Phase 1
- Count/limit as dominant element emphasizes actual resource usage (not just percentages)
- Pulse animation for >90% provides subtle urgency without being disruptive

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 02-usage-cards*
*Context gathered: 2026-01-31*
