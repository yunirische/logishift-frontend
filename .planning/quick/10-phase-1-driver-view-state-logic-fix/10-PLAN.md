---
phase: 10-phase-1-driver-view-state-logic-fix
plan: 10
type: execute
wave: 1
depends_on: []
files_modified:
  - src/views/DriverView.tsx
  - e2e/demo-driver.spec.ts
autonomous: false
user_setup: []

must_haves:
  truths:
    - "Demo driver (tenant_id 999) sees Active Shift view after clicking Start Shift"
    - "My Shifts history visible at bottom of DriverView for all roles"
    - "Start Shift button has proper styling (w-full, py-3, rounded-lg)"
    - "Playwright test verifies demo driver shift start flow"
  artifacts:
    - path: "src/views/DriverView.tsx"
      provides: "Driver view with state machine and history"
      contains: "handleStart"
    - path: "e2e/demo-driver.spec.ts"
      provides: "E2E test for demo driver workflow"
      exports: ["test"]
  key_links:
    - from: "DriverView.tsx handleStart"
      to: "setActiveShift state"
      via: "Mock shift construction for tenant 999"
      pattern: "tenant_id === 999.*mockShift"
    - from: "DriverView.tsx"
      to: "/api/v1/shifts"
      via: "fetch shift history"
      pattern: "shiftHistory"
---

<objective>
Fix state machine bug where "Start Shift" triggers toast but doesn't update UI to Active Shift view, add shift history list, fix button styling, and create Playwright verification test.

Purpose: Demo driver mode (tenant 999) is broken - users click start shift but don't see the timer/end button. Real drivers also need shift history visibility.
Output: Working state machine for demo drivers, shift history component, and automated E2E test
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md

# Current State Analysis

From DriverView.tsx (lines 86-137):
- `handleStart` ALREADY has mock shift logic for tenant 999
- Mock shift is constructed and `setActiveShift(mockShift)` is called
- `localStorage.setItem('logishift_active_shift', ...)` is called
- Issue: The state update may not be triggering re-render properly

From Dashboard.tsx (lines 397-401):
- Drivers get `<DriverView />` - correct routing
- Admins get admin dashboard

Root cause analysis:
- The mock shift object is created correctly (lines 96-102)
- setActiveShift is called (line 103)
- But the condition check on line 294 `{!activeShift || user?.current_state === "idle"}` may be failing due to user.current_state not being synced
- The refreshUser() on line 114 updates localStorage but may not trigger AuthContext re-render
</context>

<tasks>

<task type="auto">
  <name>Fix demo driver state machine - ensure UI updates to Active Shift view</name>
  <files>src/views/DriverView.tsx</files>
  <action>
    Fix the state update issue in handleStart for demo mode (tenant_id === 999):

    1. After constructing mockShift, ensure BOTH state updates happen:
       - `setActiveShift(mockShift)` - already there
       - `await refreshUser()` - already there but may need to happen AFTER setActiveShift

    2. Critical fix: The condition on line 294 checks `user?.current_state === "idle"` but we're setting `DriverState.ACTIVE` (enum). Ensure consistency:
       - Use string literal "active" not enum `DriverState.ACTIVE`
       - Or update the condition to check against enum values

    3. Add immediate state sync after mock shift creation:
       ```typescript
       // Force immediate state update for demo mode
       setActiveShift(mockShift);
       localStorage.setItem('logishift_active_shift', JSON.stringify(mockShift));

       // Update user state to active (string literal, not enum)
       const updatedUser = { ...user, current_state: 'active' };
       localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));
       await refreshUser(); // This triggers AuthContext update
       ```

    4. Verify the rendering condition (line 294) properly handles the updated state:
       - Change `{!activeShift || user?.current_state === "idle"}` to handle both null check and state check
       - Consider: `{!activeShift}` should be sufficient since activeShift presence drives the UI

    Do NOT change production mode logic (lines 122-136).
  </action>
  <verify>
    Manual test: Login as demo@logishift.ru, select truck/site, click "Открыть смену", verify Timer/End button appears
  </verify>
  <done>Toast appears AND UI switches to "Смена открыта" view with Timer and "Завершить работу" button</done>
</task>

<task type="auto">
  <name>Ensure My Shifts history component is visible and styled properly</name>
  <files>src/views/DriverView.tsx</files>
  <action>
    The shift history section already exists (lines 394-432). Verify and ensure:

    1. History section appears for BOTH demo and production drivers
    2. Uses JetBrains Mono font for dates (add `font-mono` class to date span on line 411-415)
    3. Compact row format: [DD.MM] | [Truck] | [Hours if available]
    4. Fetches last 5 finished shifts via api.get (already on line 67)

    Update the date display to use DD.MM format with JetBrains Mono:
    ```typescript
    <span className="text-xs text-slate-400 font-mono">
      {shift.created_at ? new Date(shift.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
      }) : '—'}
    </span>
    ```

    Ensure the history section shows when `shiftHistory.length > 0` regardless of user role.
  </action>
  <verify>Check that history section appears below the shift selection cards with proper JetBrains Mono styling</verify>
  <done>Shift history rows visible with monospace date format (DD.MM)</done>
</task>

<task type="auto">
  <name>Fix crooked Start Shift button styling</name>
  <files>src/views/DriverView.tsx</files>
  <action>
    Audit and fix the "Start Shift" button styles (lines 434-442):

    Current classes (line 437): `"w-full py-5 bg-[#0a192f] hover:bg-[#152238] text-white font-bold text-xl shadow-xl shadow-[#0a192f]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"`

    Verify and fix:
    1. `w-full` - present (correct)
    2. Padding: Change `py-5` to `py-3` for consistent sizing
    3. Border radius: Add `rounded-lg` (currently missing, may be causing "crooked" look)
    4. Text size: Keep `text-xl` or reduce to `text-lg` for consistency
    5. Icon size: Ensure `Play` icon is properly sized

    Updated className:
    `"w-full py-3 rounded-lg bg-[#0a192f] hover:bg-[#152238] text-white font-bold text-lg shadow-lg shadow-[#0a192f]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"`
  </action>
  <verify>Visually inspect button alignment and proportions in the UI</verify>
  <done>Button has consistent width, padding, border radius, and visual alignment</done>
</task>

<task type="auto">
  <name>Create Playwright E2E test for demo driver shift start flow</name>
  <files>e2e/demo-driver.spec.ts</files>
  <action>
    Create new E2E test file `e2e/demo-driver.spec.ts` with test scenario:

    1. Login as demo user (demo@logishift.ru / demo password)
    2. Navigate to Driver view (click "Мой рабочий день" or verify direct route)
    3. Select a truck from the truck grid
    4. Select a site from the site list
    5. Click "Открыть смену" button
    6. Assert: Verify the Active Shift view appears by checking for:
       - Timer element or "Смена #" header
       - "Завершить работу" button
       - Truck and site info display

    Use test structure from existing `e2e/login.spec.ts` as reference:
    ```typescript
    import { test, expect } from '@playwright/test';

    test.describe('Demo Driver Workflow', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/');
      });

      test('should complete demo driver shift start flow', async ({ page }) => {
        // Login as demo user
        await page.locator('input[name="username"]').fill('demo@logishift.ru');
        await page.locator('input[name="password"]').fill('demo123');
        await page.locator('button[type="submit"]').click();

        // Wait for navigation to dashboard
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });

        // Navigate to driver view
        await page.locator('text=Мой рабочий день').click();

        // Select truck (first available)
        await page.locator('[class*="border-slate-200"]').first().click();

        // Select site (first available)
        // ... adjust selectors based on actual DOM

        // Click start shift
        await page.locator('text=Открыть смену').click();

        // Assert active shift view is visible
        await expect(page.locator('text=Завершить работу')).toBeVisible({ timeout: 5000 });
      });
    });
    ```

    Note: Adjust selectors based on actual DOM structure. Use data-testid attributes if available, or use accessible text selectors.
  </action>
  <verify>Run `npx playwright test e2e/demo-driver.spec.ts` and verify test passes</verify>
  <done>Test file exists and validates the complete demo driver shift start flow</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>All four fixes: state machine, shift history, button styling, and E2E test</what-built>
  <how-to-verify>
    1. Login as demo@logishift.ru (or any demo tenant user)
    2. Navigate to Driver view ("Мой рабочий день")
    3. Select a truck and site
    4. Click "Открыть смену"
    5. Verify: UI switches to Active Shift view with Timer and "Завершить работу" button
    6. Verify: Shift history section appears at bottom with proper styling
    7. Verify: Start button has consistent styling (not crooked)
    8. Run E2E test: `npx playwright test e2e/demo-driver.spec.ts`
  </how-to-verify>
  <resume_signal>Type "approved" or describe issues</resume_signal>
</task>

</tasks>

<verification>
Overall phase verification:
- [ ] Demo driver can successfully start a shift and see the Active Shift UI
- [ ] Shift history appears with JetBrains Mono date formatting
- [ ] Start Shift button has proper styling (rounded-lg, py-3, w-full)
- [ ] Playwright test passes locally
</verification>

<success_criteria>
Measurable completion criteria:
- [ ] State machine: Clicking "Start Shift" updates UI to show Timer/End button
- [ ] History: Last 5 shifts visible at bottom of DriverView
- [ ] Styling: Button has consistent rounded-lg corners and padding
- [ ] E2E: Test file validates the full demo driver workflow
</success_criteria>

<output>
After completion, create `.planning/quick/10-phase-1-driver-view-state-logic-fix/10-SUMMARY.md`
</output>
