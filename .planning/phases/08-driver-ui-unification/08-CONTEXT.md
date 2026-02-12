# Phase 8: Driver UI Unification - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

## Phase Boundary

Drivers experience a unified, state-synchronized interface across all user roles with real-time updates. All roles (ADMIN/FOREMAN/DRIVER) see the same DriverView component with consistent behavior and immediate state updates without page reloads.

## Implementation Decisions

### Role-specific rendering
- Exact same UI across all roles — no role-based variations in DriverView
- Admins/foremen only see their own shifts (not other drivers' data) when navigating to driver view
- Same navigation entry points for all roles
- Demo Driver mode provides full simulation — identical UI and behavior to production

### Real-time state sync
- Immediate re-render when state changes (e.g., Start Shift → Timer appears without reload)
- Refetch on actions mechanism — key actions trigger data refresh, React handles UI diffing
- All driver actions trigger refresh across relevant views (dashboard stats update when any driver starts/finishes)
- Dashboard synchronization: Hybrid approach
  - Polling every 60 seconds for active shifts count
  - Window focus event triggers refresh (tab switch → latest data)

### Demo Driver mode
- Auto-detect by tenant (Tenant 999 = demo mode)
- Same API endpoints as production, different data (isolated to demo tenant)
- Full functionality — no restrictions or safety guards needed
- No visual distinction from production (full simulation)

### Shift history visibility
- Compact section below main driver controls
- "View More" button opens modal with full shift history
- Technical row format per shift: Date | Truck Plate | Site | Hours
- Show 5 most recent shifts in compact section
- Full chronological list in modal

### Claude's Discretion
- Exact polling implementation details (useEffect vs custom hook)
- Loading states during refetch
- Error handling for failed sync attempts
- Modal styling and responsiveness

## Specific Ideas

- "Immediate re-render" means no page reload — state updates should feel instant
- Dashboard polling should respect battery/performance (60s is reasonable)
- Window focus refresh ensures returning users see current data

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 08-driver-ui-unification*
*Context gathered: 2026-02-12*
