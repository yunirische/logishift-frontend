---
phase: 09-shift-modal-data-integrity
plan: 03b
type: execute
wave: 3
depends_on: [09-03a]
subsystem: "EditShiftModal Photo Zone Visuals & Tab Isolation"
tags: ["photo-zones", "russian-tags", "industrial-dropzone", "tab-isolation"]

dependency_graph:
  requires:
    - phase: 09-shift-modal-data-integrity
      plan: 03a
      reason: "Smart Hybrid visibility and loading states required before adding visual elements"
  provides:
    - phase: 09-shift-modal-data-integrity
      plan: 04
      reason: "Photo zone patterns complete, modal ready for data integrity validation"
  affects:
    - component: "EditShiftModal"
      reason: "Added Russian technical tags, industrial dropzone styling, and Details tab isolation for photo zones"

tech_stack:
  added: []
  patterns:
    - "Russian technical tags with JetBrains Mono font styling"
    - "Industrial dropzone: dashed border + centered icon + Russian label"
    - "Photo zones isolated to Details tab via conditional rendering"
    - "Hover effect: border-slate-400, bg-slate-100 transition-colors"

key_files:
  created: []
  modified:
    - path: "src/components/EditShiftModal.tsx"
      changes: "Added Russian technical tags [ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО], industrial dropzone styling for empty zones, wrapped photo zones with activeTab === 'details' condition"

decisions:
  - "Technical tags use Russian labels in JetBrains Mono (font-mono equivalent)"
  - "Required zones: emerald bg with green text, Optional zones: slate bg with gray text"
  - "Empty zones use industrial dropzone: dashed border + Image icon + Russian label"
  - "Photo zones only render in Details tab (not History/Comments tabs)"
  - "Settings load on modal open for immediate photo zone availability"
  - "Layout collapse: hidden zones don't reserve space via conditional rendering"

metrics:
  duration: "6 minutes"
  completed_date: "2026-02-12T19:14:00Z"
  tasks_completed: 3
  files_modified: 1
  commits: 3
  deviations: 0
---

# Phase 09 Plan 03b: Russian Technical Tags & Industrial Dropzone Styling - Summary

**One-liner:** Implemented Russian technical tags ([ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО]) in JetBrains Mono and industrial dropzone styling for photo zones, isolated to Details tab.

## Objective

Per MODAL-04 requirement and user decisions, photo zones must display Russian technical tags ([ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО]) in JetBrains Mono font, and empty zones must show industrial dropzone styling with dashed border, centered icon, and Russian label. Previous implementation lacked these visual elements and proper tab isolation. This plan added technical tags above each zone, industrial dropzone for empty states, and Details tab conditional rendering.

## What Was Built

### 1. Russian Technical Tags

**Tag Labels:**
- Required: `[ОБЯЗАТЕЛЬНО]` (Required)
- Optional: `[ОПЦИОНАЛЬНО]` (Optional)

**Tag Styling:**
```jsx
{needsOdometer ? (
  <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">
    [ОБЯЗАТЕЛЬНО]
  </span>
) : (
  <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded">
    [ОПЦИОНАЛЬНО]
  </span>
)}
```

**Tag Placement:**
- Above each photo zone header (between zone icon and title)
- Odometer start zone: depends on `needsOdometer`
- Odometer end zone: depends on `needsOdometer`
- Invoice zone: depends on `needsInvoice`

**Color Scheme:**
- Required (emerald): `bg-emerald-100 text-emerald-700 border-emerald-200`
- Optional (slate): `bg-slate-100 text-slate-600 border-slate-200`
- Font: `font-mono` (JetBrains Mono equivalent via Tailwind)

### 2. Industrial Dropzone Styling for Empty Zones

**Empty State Structure:**
```jsx
{!(shift as any).photo_start_url ? (
  <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors">
    <input type="file" accept="image/*" className="hidden" disabled={uploadingPhotoType === 'start'} onChange={...} />
    <Image size={24} className="text-slate-400 mx-auto mb-2" />
    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">
      Одометр (старт)
    </span>
    <span className="text-xs text-slate-400 block mt-1">
      Перетащите или нажмите для загрузки
    </span>
  </label>
) : (
  // View link + upload button for existing photo
)}
```

**Styling Elements:**
- Container: `border-2 border-dashed border-slate-300 rounded-lg p-6`
- Background: `bg-slate-50`
- Icon: `Image size={24}` centered with `mx-auto mb-2`
- Zone label: `text-sm font-semibold text-slate-500 uppercase tracking-wider`
- Action label: `text-xs text-slate-400` - "Перетащите или нажмите для загрузки"
- Hover: `hover:border-slate-400 hover:bg-slate-100 transition-colors`

**Zones With Existing Photos:**
- Shows "Просмотр" (View) link to open photo in new tab
- Upload button below for replacement
- Consistent with app theme (bg-[#0a192f] styling)

### 3. Details Tab Isolation

**Conditional Rendering:**
```jsx
{activeTab === 'details' && (() => {
  // Photo zone logic
  return <PhotoZones />;
})()}
```

**Key Behaviors:**
- Photo zones only render when `activeTab === 'details'`
- Zones are hidden in History and Comments tabs
- Layout collapse: conditional rendering doesn't reserve space
- Settings load on modal open (not tab activation) for immediate availability
- Tab resets to 'details' on modal open

**Settings Loading:**
- `useEffect` with `isOpen` dependency triggers `loadTenantSettings()`
- Called immediately when modal opens (line 80)
- Skeleton shows during 200ms delay
- Safe defaults on error: `setTenantSettings(null)` triggers Smart Hybrid "data exists" logic

### 4. Zone Structure Examples

**Odometer Start Zone (with tag):**
```jsx
<div className="border border-slate-200 rounded-lg p-4">
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <span className="text-sm">🏁</span>
      <span className="text-sm font-semibold text-slate-700">Одометр (старт)</span>
      {needsOdometer ? (
        <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">
          [ОБЯЗАТЕЛЬНО]
        </span>
      ) : (
        <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded">
          [ОПЦИОНАЛЬНО]
        </span>
      )}
    </div>
    {hasPhoto ? <ViewLink /> : null}
  </div>
  {!hasPhoto ? <EmptyDropzone /> : <UploadButton />}
</div>
```

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Auth Gates

None encountered.

## Commits

| Hash | Type | Message |
| ------ | ---- | ------- |
| f1aff9d | feat | add Russian technical tags to photo zones |
| 7fd1f5d | feat | add industrial dropzone styling for empty photo zones |
| 4e33124 | feat | isolate photo zones to Details tab with conditional rendering |

## Verification Results

### 1. Technical Tags
- ✅ [ОБЯЗАТЕЛЬНО] tag appears for required zones (6 occurrences)
- ✅ [ОПЦИОНАЛЬНО] tag appears for optional zones
- ✅ Tags use `font-mono` class (JetBrains Mono equivalent)
- ✅ Required tags: emerald bg + green text + border
- ✅ Optional tags: slate bg + gray text + border
- ✅ Tags positioned between zone icon and title

### 2. Empty State Styling
- ✅ Empty zones show dashed border (border-dashed, 3 occurrences)
- ✅ Image icon is centered (mx-auto mb-2)
- ✅ Russian label "Перетащите или нажмите для загрузки" appears (3 occurrences)
- ✅ Hover effect exists (hover:border-slate-400, hover:bg-slate-100)
- ✅ Zone label shows in Russian (Одометр/Накладная)
- ✅ Zones with photos show "Просмотр" link + upload button

### 3. Tab Isolation
- ✅ Photo zones only render when activeTab === 'details' (conditional wrapper)
- ✅ Zones hidden in History and Comments tabs
- ✅ Settings load on modal open (line 80)
- ✅ Layout collapse: hidden zones don't reserve space (conditional rendering)
- ✅ Error handling uses safe defaults (tenantSettings null)

## Success Criteria Achieved

- [x] Photo zones display Russian technical tags [ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО] in JetBrains Mono
- [x] Empty zones show industrial dropzone: dashed border + icon + Russian label
- [x] Photo zones only render in Details tab (activeTab === 'details')
- [x] Settings load on modal open for immediate availability
- [x] Layout collapse: hidden zones don't reserve space
- [x] File size exceeds 920 lines minimum (1232 lines)

## Next Steps

Phase 09 plans complete (09-01, 09-02, 09-03a, 09-03b). Next phases will focus on additional modal improvements or data integrity validation as defined in ROADMAP.md.
