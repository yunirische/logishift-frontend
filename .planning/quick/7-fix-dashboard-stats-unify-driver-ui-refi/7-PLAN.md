---
phase: quick-007
plan: 7
type: execute
wave: 1
depends_on: []
files_modified:
  - src/views/AdminView.tsx
  - src/components/System.tsx
  - src/components/Layout.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "AdminView displays active shifts and drivers counts correctly"
    - "Telegram card uses Navy-900 theme color for consistency"
    - "Sidebar displays correct version string"
  artifacts:
    - path: "src/views/AdminView.tsx"
      provides: "Admin dashboard with working stats"
      contains: "statsRes (not statsRes.data)"
    - path: "src/components/System.tsx"
      provides: "System settings with Navy-900 themed Telegram card"
      contains: "bg-[#0a192f]"
    - path: "src/components/Layout.tsx"
      provides: "Sidebar with version display"
      contains: "V2.5 Stable"
  key_links:
    - from: "src/views/AdminView.tsx"
      to: "/dashboard/stats"
      via: "api.get('/dashboard/stats')"
      pattern: "api\\.get\\('/dashboard/stats'\\)"
---

<objective>
Fix Dashboard stats display, unify Navy-900 theme across System page, verify sidebar version display.

Purpose: AdminView stats display broken due to incorrect API response handling (using .data when api.get returns data directly), Telegram card needs Navy-900 theme for visual consistency with rest of app.

Output: Working admin stats display, unified Navy-900 theme on Telegram card, verified version string.
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/views/AdminView.tsx
@src/components/System.tsx
@src/components/Layout.tsx
@src/services/api.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix AdminView stats API response handling</name>
  <files>src/views/AdminView.tsx</files>
  <action>
    Fix the API response handling in AdminView.tsx (line 19):
    - Change `setStats(statsRes.data)` to `setStats(statsRes)`
    - Change `setShifts(shiftsRes.data)` to `setShifts(shiftsRes)`

    Root cause: The api.get() function in api.ts returns data directly (response.json()), not wrapped in a .data property. The .data property exists in axios but this codebase uses native fetch with a wrapper that returns the parsed JSON directly.

    Reference: src/services/api.ts lines 185-190 show that successful JSON responses return `response.json()` directly, not `{ data: response.json() }`.
  </action>
  <verify>
    Check that stats.activeShifts and stats.activeDrivers display non-zero values when shifts are active. Browser DevTools Console should show no undefined errors.
  </verify>
  <done>AdminView correctly displays activeShifts and activeDrivers counts from /dashboard/stats endpoint</done>
</task>

<task type="auto">
  <name>Task 2: Apply Navy-900 theme to Telegram card in System.tsx</name>
  <files>src/components/System.tsx</files>
  <action>
    Update the Telegram integration card (around line 326) to use Navy-900 theme:
    - Change the card content background from `bg-[#F4F7FE]` to `bg-white`
    - Change the card header gradient from `from-[#0a192f] to-[#1e293b]` to use Navy-900 colors: `from-[#0a192f] to-[#1a2738]`
    - Ensure the "Connect" button uses `bg-[#0a192f]` and hover `bg-[#152238]`

    This unifies the Telegram card visual style with the Subscription card and Tenant Settings card which already use the Navy-900 theme properly.
  </action>
  <verify>
    Visual inspection: Telegram card header should have the same dark Navy-900 gradient as the Subscription and Settings cards. The button should match the theme.
  </verify>
  <done>Telegram card uses Navy-900 gradient header matching other cards on System page</done>
</task>

<task type="auto">
  <name>Task 3: Verify and document version string in sidebar</name>
  <files>src/components/Layout.tsx</files>
  <action>
    Verify the version string in Layout.tsx (line 185) displays "KONTROLSMEN V2.5 Stable":
    - Check line 185: `<p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">KONTROLSMEN V2.5 Stable</p>`
    - If correct, no change needed
    - If incorrect (e.g., typo like "KONTROLSMEN" instead of "LogiShift" or wrong version), update to "LogiShift V2.5 Stable"

    Note: The product name "LogiShift" should be consistent. The current value shows "KONTROLSMEN" which may be intentional (internal codename) or a typo - verify against branding.
  </action>
  <verify>
    Sidebar shows consistent version text. Check against src/components/System.tsx header which shows "Система" - verify if product name should be LogiShift or Kontrolsmen.
  </verify>
  <done>Sidebar displays correct and consistent product name and version</done>
</task>

</tasks>

<verification>
1. Login as admin/foreman user
2. Navigate to Dashboard - verify stats display correctly (non-zero if shifts exist)
3. Navigate to System - verify Telegram card has Navy-900 header matching other cards
4. Check sidebar version display is consistent
</verification>

<success_criteria>
- AdminView shows activeShifts and activeDrivers values (not undefined/0 when data exists)
- Telegram card header matches Navy-900 theme of other cards
- Version string is documented and consistent
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-dashboard-stats-unify-driver-ui-refi/7-SUMMARY.md`
</output>
