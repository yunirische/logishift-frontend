---
phase: 09-shift-modal-data-integrity
plan: 03a
type: execute
wave: 2
depends_on: [09-01]
subsystem: "EditShiftModal Photo Zone Loading & Visibility"
tags: ["loading-states", "smart-hybrid-visibility", "photo-zones", "skeleton-ui"]

dependency_graph:
  requires:
    - phase: 09-shift-modal-data-integrity
      plan: 01
      reason: "Tabbed interface structure required before adding conditional photo zones work"
  provides:
    - phase: 09-shift-modal-data-integrity
      plan: 03b
      reason: "Smart Hybrid visibility pattern applies to comments section formatting"
  affects:
    - component: "EditShiftModal"
      reason: "Added loading states for tenant settings and Smart Hybrid visibility for photo zones"

tech_stack:
  added: []
  patterns:
    - "200ms delayed skeleton loading to avoid flicker"
    - "Smart Hybrid visibility: show if Required OR if Data Exists"
    - "Content-aware skeleton: mimics actual photo zone structure"
    - "Independent zone visibility tracking per zone type"

key_files:
  created: []
  modified:
    - path: "src/components/EditShiftModal.tsx"
      changes: "Added loadingSettings and showSettingsSkeleton state, 200ms skeleton delay, shouldShowZone helper function, Smart Hybrid visibility for all photo zones"

decisions:
  - "Loading skeleton shows after 200ms delay to avoid flicker on fast API responses"
  - "Skeleton mimics actual photo zone structure (3 placeholder blocks at h-24 each)"
  - "Smart Hybrid visibility: zones show if Required OR if Data Exists (not just Required)"
  - "Empty state only shows when ALL zones are hidden by Smart Hybrid logic"
  - "Photo zones persist independently: start, end, invoice zones track requirement + data separately"

metrics:
  duration: "5 minutes"
  completed_date: "2026-02-13T20:15:00Z"
  tasks_completed: 2
  files_modified: 1
  commits: 2
  deviations: 0
---

# Phase 09 Plan 03a: Smart Hybrid Visibility & Loading States - Summary

**One-liner:** Implemented Smart Hybrid visibility logic for photo upload zones (show if Required OR if Data Exists) with 200ms-delayed content-aware skeleton loading.

## Objective

Per MODAL-04 requirement, photo upload zones must display based on Smart Hybrid visibility (show if Required OR if Data Exists). Previous implementation (lines 404-571) lacked this logic and proper loading states. This plan added `shouldShowZone` function, proper zone visibility conditions, and 200ms-delayed skeleton loading with content-aware placeholders.

## What Was Built

### 1. Loading State with 200ms Skeleton Delay

**State Variables:**
- `loadingSettings`: Tracks active API request to `/tenant-settings`
- `showSettingsSkeleton`: Controls skeleton visibility (only after 200ms delay)

**Delay Logic:**
```javascript
const skeletonTimer = setTimeout(() => {
  if (loadingSettings) {
    setShowSettingsSkeleton(true);
  }
}, 200);
```

**Benefits:**
- Avoids flicker on fast API responses (<200ms)
- Shows skeleton for slower responses
- `clearTimeout` in finally block prevents memory leaks

**Skeleton UI:**
- 3 placeholder blocks matching actual zone structure
- Each: `h-24 bg-slate-100 border border-slate-200 rounded-lg animate-pulse`
- Content-aware design mimics final layout

### 2. Smart Hybrid Visibility Logic

**Core Function:**
```javascript
const shouldShowZone = (isRequired: boolean, hasData: boolean) => {
  return isRequired || hasData;
};
```

**Zone Tracking:**
- `hasStartPhoto = !!shift.photo_start_url`
- `hasEndPhoto = !!shift.photo_end_url`
- `hasInvoicePhoto = !!shift.photo_invoice_url`
- `showStartZone = shouldShowZone(needsOdometer, hasStartPhoto)`
- `showEndZone = shouldShowZone(needsOdometer, hasEndPhoto)`
- `showInvoiceZone = shouldShowZone(needsInvoice, hasInvoicePhoto)`

**Behavior Examples:**

| Site Requirement | Photo Data Exists | Zone Shows |
|-----------------|-------------------|------------|
| Required ✓ | No ✓ | Yes (required) |
| Required ✓ | Yes ✓ | Yes (required + data) |
| Not Required ✗ | Yes ✓ | **Yes (data exists)** ← Smart Hybrid |
| Not Required ✗ | No ✗ | No (hidden) |

### 3. Updated Empty State

**Previous Logic:**
```javascript
if (!hasAnyRequirements) { // Only checked requirements
  return <EmptyState />;
}
```

**New Logic:**
```javascript
if (!hasAnyVisibleZones) { // Checks Smart Hybrid visibility
  return <EmptyState />;
}
```

**Result:** Empty state only shows when ALL zones are hidden by Smart Hybrid logic, not just when site has no requirements.

### 4. Independent Zone Visibility

Each zone type independently tracks:
- Start odometer zone: `showStartZone`
- End odometer zone: `showEndZone`
- Invoice zone: `showInvoiceZone`

This means:
- If site requires odometer photos: show both start/end zones
- If site doesn't require odometer BUT user uploaded start: show start zone only
- If site doesn't require odometer BUT user uploaded end: show end zone only
- Same logic applies to invoice zone

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Auth Gates

None encountered.

## Commits

| Hash | Type | Message |
| ------ | ---- | ------- |
| 73f860b | feat | add loading state for tenant settings with 200ms skeleton delay |
| 43b6cde | feat | implement Smart Hybrid visibility logic for photo zones |

## Verification Results

### 1. Loading States
- ✅ `loadingSettings` and `showSettingsSkeleton` states exist
- ✅ 200ms `setTimeout` exists before showing skeleton
- ✅ `clearTimeout` exists in finally block
- ✅ Skeleton renders in photo zones section with 3 placeholder blocks
- ✅ Skeleton uses `animate-pulse` with proper sizing (`h-24`)

### 2. Smart Hybrid Visibility
- ✅ `shouldShowZone` function exists with `isRequired || hasData` logic
- ✅ Zone visibility uses `showStartZone`, `showEndZone`, `showInvoiceZone`
- ✅ Each zone tracks requirement + data status independently
- ✅ Empty state only shows when all zones are hidden by Smart Hybrid logic
- ✅ Zones with data persist even when requirements change to not require them

### 3. Layout Behavior
- ✅ Hidden zones don't reserve space (conditional rendering, not CSS hiding)
- ✅ Empty state message: "Фото не требуются по настройкам объекта"
- ✅ No reserved whitespace for hidden zones

## Success Criteria Achieved

- [x] Photo zones use Smart Hybrid visibility: show if Required OR if Data Exists
- [x] Zones persist if data exists even when requirements change
- [x] Loading skeleton shows after 200ms delay with content-aware structure
- [x] "No requirements" message only shows when all zones are hidden by Smart Hybrid logic
- [x] Hidden zones have layout collapse (no reserved space)

## Next Steps

Plan 09-03b will apply Smart Hybrid visibility patterns to the comments section formatting, implementing proper technical headers and improved readability per CONTEXT.md decisions.
