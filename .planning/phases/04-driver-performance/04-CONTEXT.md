# Phase 4: Driver Performance - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Display a ranked list of top drivers by hours worked. Users can view driver performance metrics (name, shifts, hours, salary) in a table format that updates when time range changes. Ranking is based on hours worked (highest first). Configurable driver limit (default: 10) with tie handling.

</domain>

<decisions>
## Implementation Decisions

### List layout
- **Table view** (not cards or hybrid)
- **All 5 columns visible by default**: Rank #, Driver Name, Shifts, Hours, Salary
- **Medal icons** for top 3 rankings (#1 🥇, #2 🥈, #3 🥉)
- **Compact information density**: 8pt/10pt fonts, tight padding, minimal whitespace

### Sorting behavior
- **Clickable column headers** for user-controlled sorting (not fixed)
- **Numeric columns sortable only**: Shifts, Hours, Salary (Rank and Name not sortable)
- **Visual indicators**: Both arrow icons (↑ ↓) AND highlight on active sort column
- **Toggle direction**: Clicking same column again reverses sort order (highest/lowest)

### Driver limit
- **Fixed at top 10 drivers** (no configurable dropdown or load-more button)
- **Include all ties** at cutoff boundary (may show 11-13 drivers if hours are tied)
- **Explanatory text** above table when ties exist: "Showing 12 drivers (3 tied at rank 10)"
- **Number all rows**: Ties share rank (e.g., 10, 10, 10, 13), beyond top 10 still numbered

### Empty/error states
- **Icon + text** for empty state (not text-only or full illustrated CTA)
- **Context-aware message**: "No shifts completed in the last X days. Select a longer time range."
- **Simple error + retry button** for API errors: "Couldn't load rankings. Try again."
- **Retry + suggestions**: Empty state has "Try again" button + shortcut buttons for "Last 30 days", "Last 90 days"

### Claude's Discretion
- Exact spacing and typography for table cells
- Icon choice for empty state illustration
- Visual styling of sort indicators (arrow position, color)
- Error handling edge cases (partial data, malformed responses)

</decisions>

<specifics>
## Specific Ideas

- Table view for information density — similar to usage cards pattern but tabular
- Medal icons for top 3 create gamification and visual hierarchy
- Compact layout fits more data on screen, important for analytics
- Ties handled transparently so users understand why 12 drivers appear
- Context-aware empty states guide users to useful actions (try longer time range)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-driver-performance*
*Context gathered: 2026-01-31*
