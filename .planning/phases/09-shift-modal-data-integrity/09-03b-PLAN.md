---
phase: 09-shift-modal-data-integrity
plan: 03b
type: execute
wave: 3
depends_on: [09-03a]
files_modified:
  - src/components/EditShiftModal.tsx
autonomous: true

must_haves:
  truths:
    - "Photo zones show Russian technical tags: [ОБЯЗАТЕЛЬНО] or [ОПЦИОНАЛЬНО]"
    - "Technical tags use JetBrains Mono font for technical label styling"
    - "Empty state shows industrial dropzone with dashed border + icon + technical label"
    - "Photo zones only render in Details tab (activeTab === 'details')"
    - "Settings load on modal open for immediate photo zone availability"
  artifacts:
    - path: "src/components/EditShiftModal.tsx"
      provides: "EditShiftModal with Russian technical tags and industrial dropzone styling"
      min_lines: 920
  key_links:
    - from: "src/components/EditShiftModal.tsx"
      to: "Technical tag display"
      via: "Russian labels [ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО] in JetBrains Mono"
      pattern: "ОБЯЗАТЕЛЬНО|ОПЦИОНАЛЬНО"
    - from: "src/components/EditShiftModal.tsx"
      to: "Industrial dropzone styling"
      via: "Dashed border + centered icon + Russian label for empty zones"
      pattern: "border-dashed|Перетащите или нажмите"
    - from: "src/components/EditShiftModal.tsx"
      to: "Details tab conditional rendering"
      via: "Photo zones only render when activeTab === 'details'"
      pattern: "activeTab === 'details'"
---

<objective>
Implement Russian technical tags and industrial dropzone styling for photo upload zones.

Purpose: Per MODAL-04 requirement and user decisions, photo zones must display Russian technical tags ([ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО]) in JetBrains Mono font, and empty zones must show industrial dropzone styling with dashed border, centered icon, and Russian label. Current implementation lacks these visual elements and proper tab isolation.

Output: Updated EditShiftModal with Russian technical tags above each photo zone and industrial dropzone styling for empty states, isolated to Details tab.
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/09-shift-modal-data-integrity/09-CONTEXT.md

@src/components/EditShiftModal.tsx
@src/constants.ts
@src/types.ts
@.planning/phases/09-shift-modal-data-integrity/09-01-SUMMARY.md
@.planning/phases/09-shift-modal-data-integrity/09-03a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Add Russian technical tags [ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО] to photo zones</name>
  <files>src/components/EditShiftModal.tsx</files>
  <action>
    Add technical tags above each photo zone per user decision: Russian labels in JetBrains Mono font.

    1. Define tag labels:
       - Required: [ОБЯЗАТЕЛЬНО] (Required)
       - Optional: [ОПЦИОНАЛЬНО] (Optional)

    2. Add tag above each zone header (between Upload icon and zone title):
       - For odometer zones: If needsOdometer, show [ОБЯЗАТЕЛЬНО], else [ОПЦИОНАЛЬНО]
       - For invoice zone: If needsInvoice, show [ОБЯЗАТЕЛЬНО], else [ОПЦИОНАЛЬНО]

    3. Tag styling:
       - px-2 py-0.5 text-[10px] font-bold rounded
       - Required: bg-emerald-100 text-emerald-700 border border-emerald-200
       - Optional: bg-slate-100 text-slate-600 border border-slate-200
       - Font: font-mono (JetBrains Mono equivalent)
       - Display: inline-block, ml-2 (gap after title)

    4. Example header for odometer start zone:
       <div className="flex items-center gap-2 mb-3">
         <Upload size={16} className="text-slate-500" />
         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
           Загрузка фото (админ)
         </label>
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

    5. Apply same pattern to all three zones:
       - Odometer start: depends on needsOdometer
       - Odometer end: depends on needsOdometer
       - Invoice: depends on needsInvoice

    The key: Russian technical tags in JetBrains Mono distinguish required from optional zones.
  </action>
  <verify>
    1. Check that [ОБЯЗАТЕЛЬНО] tag appears for required zones
    2. Check that [ОПЦИОНАЛЬНО] tag appears for optional zones
    3. Check that tags use font-mono class (JetBrains Mono equivalent)
    4. Check that tag styling matches specification (colors, spacing)
  </verify>
  <done>
    Photo zones display Russian technical tags [ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО] in JetBrains Mono above each zone.
  </done>
</task>

<task type="auto">
  <name>Implement industrial dropzone styling for empty photo zones</name>
  <files>src/components/EditShiftModal.tsx</files>
  <action>
    Update empty state for photo zones to industrial dropzone with dashed border per user decision.

    1. Current empty zone styling (lines 456-457, 499-500, 543-544) shows "Не загружено" text.
       Update to industrial dropzone:
       - Container: border-2 border-dashed border-slate-300 rounded-lg p-6
       - Background: bg-slate-50
       - Text center: text-center
       - Icon: Image size={24} className="text-slate-400 mx-auto mb-2"
       - Label: text-sm font-semibold text-slate-500 uppercase tracking-wider
       - Russian label: "Перетащите или нажмите для загрузки"

    2. For zones WITH uploaded data, keep existing "Просмотр" link:
       - Currently at lines 446-454, 490-498, 534-542
       - Keep this view link functionality
       - Add optional replace/upload below if needed

    3. Example empty odometer start zone:
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
         // Existing view link + optional replace
       )}

    4. Upload button styling (currently solid bg-#0a192f):
       - Keep for "Загрузить" button in non-empty zones
       - Consistent with app theme

    The key: Industrial dropzone with dashed border, icon, and Russian technical label for empty zones.
  </action>
  <verify>
    1. Check that empty zones show dashed border (border-dashed)
    2. Check that empty zones have Image icon centered
    3. Check that Russian label "Перетащите или нажмите для загрузки" appears
    4. Check that hover state exists (border-slate-400, bg-slate-100)
  </verify>
  <done>
    Empty photo zones display industrial dropzone with dashed border, centered icon, and Russian technical label.
  </done>
</task>

<task type="auto">
  <name>Integrate photo zone loading and conditional display into Details tab</name>
  <files>src/components/EditShiftModal.tsx</files>
  <action>
    Ensure photo zones load and display correctly in Details tab:

    1. Move photo zones to only render when activeTab === 'details':
       - Current implementation (lines 404-571) is in a self-executing function
       - Wrap with: {activeTab === 'details' (...)}

    2. Add useEffect to load tenant settings when modal opens:
       - Current implementation already calls loadTenantSettings() (line 72)
       - This is correct - load on modal open, not tab activation
       - Photo zones need settings available immediately for conditional display

    3. Handle loading state for photo zones:
       - When loadingSettings is true and tenantSettings is null:
         * Show settings skeleton (3 placeholder blocks)
       - When loadingSettings is false and tenantSettings exists:
         * Show conditional zones based on Smart Hybrid logic

    4. Handle error state:
       - If tenant settings fetch fails, use safe defaults:
         * needsOdometer = false
         * needsInvoice = false
         * Zones only show if data exists (Smart Hybrid)

    5. Ensure Layout Collapse per user decision:
       - When zone is hidden, its space collapses (no animation)
       - Current implementation should already do this via conditional rendering
       - No height:0 or hidden classes needed

    The goal: Photo zones in Details tab load settings on modal open, show/hide based on Smart Hybrid, collapse space when hidden.
  </action>
  <verify>
    1. Check that photo zones only render when activeTab === 'details'
    2. Check that loadTenantSettings is called on modal open
    3. Check that skeleton shows during loading
    4. Check that error handling uses safe defaults
    5. Check that hidden zones have no reserved space (layout collapse)
  </verify>
  <done>
    Photo zones display in Details tab only. Settings load on modal open. Zones show/hide based on Smart Hybrid with layout collapse.
  </done>
</task>

</tasks>

<verification>
Phase verification:

1. Technical tags:
   - Open EditShiftModal
   - Verify [ОБЯЗАТЕЛЬНО] tag appears for required zones
   - Verify [ОПЦИОНАЛЬНО] tag appears for optional zones
   - Verify tags use monospace font (JetBrains Mono equivalent)
   - Verify tag styling (colors, borders, spacing)

2. Empty state styling:
   - Verify empty zones show dashed border (industrial dropzone)
   - Verify Image icon is centered
   - Verify Russian label "Перетащите или нажмите для загрузки" appears
   - Verify hover effect works

3. Tab isolation:
   - Verify photo zones only render in Details tab
   - Verify zones are hidden in History and Comments tabs
   - Verify layout collapse when zones are hidden
</verification>

<success_criteria>
1. Photo zones display Russian technical tags [ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО] in JetBrains Mono
2. Empty zones show industrial dropzone: dashed border + icon + Russian label
3. Photo zones only render in Details tab (activeTab === 'details')
4. Settings load on modal open for immediate availability
5. Layout collapse: hidden zones don't reserve space
</success_criteria>

<output>
After completion, create `.planning/phases/09-shift-modal-data-integrity/09-03b-SUMMARY.md`
</output>
