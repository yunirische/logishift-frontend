---
phase: 09-shift-modal-data-integrity
plan: 03a
type: execute
wave: 2
depends_on: [09-01]
files_modified:
  - src/components/EditShiftModal.tsx
autonomous: true

must_haves:
  truths:
    - "Photo zones use Smart Hybrid visibility: show if Required OR if Data Exists"
    - "Photo zones persist if data exists even when requirements change"
    - "Loading skeleton displays while fetching tenant settings (200ms delay before skeleton)"
    - "Loading skeleton mimics actual photo zone structure for content-aware loading"
  artifacts:
    - path: "src/components/EditShiftModal.tsx"
      provides: "EditShiftModal with Smart Hybrid visibility logic for photo zones"
      min_lines: 870
  key_links:
    - from: "src/components/EditShiftModal.tsx"
      to: "API_ENDPOINTS.TENANT_SETTINGS"
      via: "loadTenantSettings function fetches site requirements"
      pattern: "api\\.get\\(API_ENDPOINTS\\.TENANT_SETTINGS"
    - from: "src/components/EditShiftModal.tsx"
      to: "Photo zone conditional rendering"
      via: "Smart Hybrid: show if Required OR if Data Exists"
      pattern: "shouldShowZone|needsOdometer|needsInvoice|photo_.*_url"
---

<objective>
Implement Smart Hybrid visibility logic and loading states for photo upload zones.

Purpose: Per MODAL-04 requirement, photo upload zones must display based on Smart Hybrid visibility (show if Required OR if Data Exists). Current implementation (lines 404-571) lacks this logic and proper loading states. This plan adds shouldShowZone function, proper zone visibility conditions, and 200ms-delayed skeleton loading.

Output: Updated EditShiftModal with Smart Hybrid visibility for photo zones and content-aware loading skeleton.
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
</context>

<tasks>

<task type="auto">
  <name>Add loading state for tenant settings with 200ms skeleton delay</name>
  <files>src/components/EditShiftModal.tsx</files>
  <action>
    Current loadTenantSettings (lines 103-110) lacks loading states. Add proper loading with skeleton delay:

    1. Add loading states:
       const [loadingSettings, setLoadingSettings] = useState(false);
       const [showSettingsSkeleton, setShowSettingsSkeleton] = useState(false);

    2. Update loadTenantSettings function:
       const loadTenantSettings = async () => {
         setLoadingSettings(true);
         setShowSettingsSkeleton(false);

         // Start 200ms delay for skeleton
         const skeletonTimer = setTimeout(() => {
           if (loadingSettings) setShowSettingsSkeleton(true);
         }, 200);

         try {
           const data = await api.get(API_ENDPOINTS.TENANT_SETTINGS);
           setTenantSettings(data);
         } catch (err) {
           console.error("Failed to load tenant settings:", err);
           setTenantSettings(null);
         } finally {
           clearTimeout(skeletonTimer);
           setLoadingSettings(false);
           setShowSettingsSkeleton(false);
         }
       };

    3. Add skeleton for photo zones section:
       - When showSettingsSkeleton is true
       - Render 3 placeholder blocks (one per zone type)
       - Each: h-24 bg-slate-100 border border-slate-200 rounded-lg animate-pulse
       - Mimics actual zone structure for content-aware skeleton

    The key: Show skeleton only after 200ms to avoid flicker on fast loads.
  </action>
  <verify>
    1. Check that loadingSettings and showSettingsSkeleton states exist
    2. Check that 200ms setTimeout exists before showing skeleton
    3. Check that clearTimeout exists in finally block
    4. Check that skeleton renders in photo zones section
  </verify>
  <done>
    Photo zones section shows loading skeleton after 200ms delay. Skeleton mimics actual zone structure.
  </done>
</task>

<task type="auto">
  <name>Implement Smart Hybrid visibility logic for photo zones</name>
  <files>src/components/EditShiftModal.tsx</files>
  <action>
    Current logic (lines 407-409) only checks site requirements. Update to Smart Hybrid: Show if Required OR if Data Exists.

    1. Define visibility condition function:
       const shouldShowZone = (isRequired: boolean, hasData: boolean) => {
         // Smart Hybrid: show if required OR if data exists
         return isRequired || hasData;
       };

    2. Update zone visibility logic (replace lines 407-409):
       - odometer_start: shouldShowZone(needsOdometer, !!shift.photo_start_url)
       - odometer_end: shouldShowZone(needsOdometer, !!shift.photo_end_url)
       - invoice: shouldShowZone(needsInvoice, !!shift.photo_invoice_url)

    3. This means:
       - If site requires odometer photos: show both start/end zones
       - If site doesn't require odometer BUT user has uploaded start: show start zone
       - If site doesn't require odometer BUT user has uploaded end: show end zone
       - Same logic for invoice zone

    4. Update "no requirements" empty state (lines 411-424):
       - Only show when ALL zones are hidden by Smart Hybrid
       - Condition: !shouldShowZone(needsOdometer, hasStart) &&
                     !shouldShowZone(needsOdometer, hasEnd) &&
                     !shouldShowZone(needsInvoice, hasInvoice)

    The key: Zones stay visible if they have data even if settings change to not require them.
  </action>
  <verify>
    1. Check that shouldShowZone function exists with isRequired || hasData logic
    2. Check that zone visibility uses shouldShowZone for each zone type
    3. Check that "no requirements" empty state only shows when all zones hidden
  </verify>
  <done>
    Photo zones use Smart Hybrid visibility: show if Required OR if Data Exists. Zones persist if data exists even when requirements change.
  </done>
</task>

</tasks>

<verification>
Phase verification:

1. Loading states:
   - Open EditShiftModal
   - Verify skeleton shows during settings load
   - Verify 200ms delay before skeleton appears
   - Verify skeleton mimics actual zone structure (3 placeholder blocks)

2. Smart Hybrid visibility:
   - Upload photo to a zone
   - Change site settings to make zone optional
   - Verify zone still shows (because data exists)
   - Delete photo from zone
   - Verify zone hides (not required + no data)

3. Layout collapse:
   - Verify hidden zones don't reserve space
   - Verify "no requirements" message only shows when ALL zones are hidden
</verification>

<success_criteria>
1. Photo zones use Smart Hybrid visibility: show if Required OR if Data Exists
2. Zones persist if data exists even when requirements change
3. Loading skeleton shows after 200ms delay with content-aware structure
4. "No requirements" message only shows when all zones are hidden by Smart Hybrid logic
5. Hidden zones have layout collapse (no reserved space)
</success_criteria>

<output>
After completion, create `.planning/phases/09-shift-modal-data-integrity/09-03a-SUMMARY.md`
</output>
