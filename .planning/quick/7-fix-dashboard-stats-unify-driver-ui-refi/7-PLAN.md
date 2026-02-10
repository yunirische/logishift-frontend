---
phase: quick-007
plan: 7
type: execute
wave: 1
depends_on: []
files_modified:
  - src/views/AdminView.tsx
  - src/views/Dashboard.tsx
  - src/components/DriverView.tsx
  - src/components/System.tsx
  - src/components/Layout.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "AdminView displays active shifts and drivers counts correctly"
    - "Driver view uses standard DriverView component (no mock/demo screens)"
    - "Requirements info block shows odometer/photo requirements before shift start"
    - "Shift history section shows user's completed shifts"
    - "Telegram card uses Navy-900 theme color for consistency"
    - "Sidebar displays correct version string"
  artifacts:
    - path: "src/views/AdminView.tsx"
      provides: "Admin dashboard with working stats"
      contains: "statsRes (not statsRes.data)"
    - path: "src/views/Dashboard.tsx"
      provides: "Driver dashboard with standard DriverView and shift history"
      contains: "DriverView component, requirements info, shift history"
    - path: "src/components/DriverView.tsx"
      provides: "Requirements info block with odometer/invoice requirements"
      contains: "Требуется фото одометра, Требуется накладная"
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
    - from: "src/views/Dashboard.tsx"
      to: "DriverView"
      via: "import and use DriverView component"
      pattern: "DriverView"
    - from: "src/views/Dashboard.tsx"
      to: "Shift history"
      via: "api.getShifts({ userId })"
      pattern: "api\\.getShifts"
---

<objective>
Fix Dashboard stats display, unify Driver UI with standard components, add shift history and requirements info, apply Navy-900 theme polish.

Purpose:
1. AdminView stats display broken due to incorrect API response handling
2. Driver view has multiple mock/demo screens - need to unify to single DriverView
3. Missing requirements info (odometer/invoice) before shift start
4. Missing shift history for drivers
5. Telegram card needs Navy-900 theme for visual consistency

Output: Working admin stats, unified driver UI with standard components, requirements info block, shift history, Navy-900 theme polish.
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

<task type="auto">
  <name>Task 4: Unify Driver UI - use standard DriverView component</name>
  <files>src/views/Dashboard.tsx</files>
  <action>
    Remove all mock/demo driver screens and use standard DriverView component:
    1. In Dashboard.tsx driver mode, ensure it uses the standard DriverView component
    2. Remove any conditional rendering for "demo" or "simplified" driver views
    3. Ensure demo persona switcher only changes the role/UI context, not the component implementation
    4. The backend demoGuard will handle demo mode - frontend should use same code path

    This ensures single source of truth for driver experience across all modes.
  </action>
  <verify>
    Check Dashboard.tsx - driver role should render standard DriverView without special demo/mode conditionals.
  </verify>
  <done>Driver dashboard uses standard DriverView component for all modes (real and demo)</done>
</task>

<task type="auto">
  <name>Task 5: Add requirements info block before shift start</name>
  <files>src/components/DriverView.tsx</files>
  <action>
    Add an info block that displays when vehicle and site are selected but shift hasn't started:
    - "Требуется фото одометра: [Да/Нет]" - based on site settings
    - "Требуется накладная: [Да/Нет]" - based on site settings

    Get requirements from the selected site's settings (site.requiresOdometerPhoto, site.requiresInvoice).
    Display this info in a clear, visually distinct block above the "Начать смену" button.
  </action>
  <verify>
    In driver mode, select a vehicle and site - verify requirements info appears before starting shift.
  </verify>
  <done>Requirements info block shows odometer and invoice requirements from site settings</done>
</task>

<task type="auto">
  <name>Task 6: Add shift history for current driver</name>
  <files>src/components/DriverView.tsx, src/views/Dashboard.tsx</files>
  <action>
    Add a "Мои последние смены" section below the "Начать смену" button:
    1. Fetch completed shifts using `api.getShifts({ userId: currentUser.id, status: 'completed' })`
    2. Display list of recent completed shifts (limit to 5-10)
    3. Show basic info: date, vehicle, site, duration
    4. Use standard shift card component or table for display

    This helps drivers see their recent work history.
  </action>
  <verify>
    As a driver, after completing shifts, verify "Мои последние смены" section appears with completed shift history.
  </verify>
  <done>Shift history section displays driver's completed shifts with key information</done>
</task>

</tasks>

<verification>
1. Login as admin/foreman - verify Dashboard stats display correctly
2. Login as driver - verify standard DriverView is used (no mock screens)
3. As driver, select vehicle/site - verify requirements info block appears
4. As driver, complete a shift - verify it appears in shift history
5. Navigate to System - verify Telegram card has Navy-900 header
6. Check sidebar version display is consistent
</verification>

<success_criteria>
- AdminView shows activeShifts and activeDrivers values correctly
- Driver dashboard uses standard DriverView for all modes
- Requirements info block displays before shift start
- Shift history section shows completed shifts
- Telegram card header matches Navy-900 theme
- Version string is consistent
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-dashboard-stats-unify-driver-ui-refi/7-SUMMARY.md`
</output>
