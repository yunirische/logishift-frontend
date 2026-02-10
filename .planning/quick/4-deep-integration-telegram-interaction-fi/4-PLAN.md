---
phase: quick-004
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/System.tsx
  - src/components/Settings.tsx
  - src/components/Layout.tsx
  - src/views/Dashboard.tsx
  - src/views/DriverView.tsx
autonomous: true

must_haves:
  truths:
    - "Telegram link handles alreadyLinked response with appropriate toast message"
    - "Demo mode (999) forces shift state updates on start/end with mock objects"
    - "Sidebar hides all admin tabs when tenant_id=999 AND demoView='driver'"
    - "All toasts use Navy-900 styling (#0a192f)"
    - "Open Shift button uses Navy-900 background"
  artifacts:
    - path: "src/components/Settings.tsx"
      provides: "Enhanced Telegram linking with alreadyLinked handling"
      contains: "alreadyLinked.*refreshUser"
    - path: "src/components/Layout.tsx"
      provides: "Sidebar filtering for demo driver mode"
      contains: "tenant_id.*999.*demoView.*driver"
    - path: "src/views/Dashboard.tsx"
      provides: "Demo mode shift state forcing on start/end"
      contains: "mock.*shift.*999"
  key_links:
    - from: "src/components/Settings.tsx"
      to: "AuthContext"
      via: "refreshUser() call after Telegram link"
      pattern: "refreshUser"
    - from: "src/views/Dashboard.tsx"
      to: "localStorage['logishift_active_shift']"
      via: "Force state update for demo mode"
      pattern: "999.*mock.*shift"
---

<objective>
Deep integration: Telegram interaction fix, demo state machine realism, sidebar isolation

Purpose: Handle Telegram edge cases, make demo mode feel realistic with immediate state updates, isolate driver view in demo mode, ensure Navy-900 theme consistency.

Output: Robust Telegram linking, realistic demo state transitions, isolated driver mode UI, consistent Navy-900 theming.
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/System.tsx
@src/components/Settings.tsx
@src/components/Layout.tsx
@src/views/Dashboard.tsx
@src/views/DriverView.tsx
@src/types.ts
@src/context/AuthContext.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Telegram interaction to handle alreadyLinked response</name>
  <files>src/components/Settings.tsx, src/components/System.tsx</files>
  <action>
    In both Settings.tsx and System.tsx, update the handleGenerateTelegramLink function:

    1. Check the API response for `alreadyLinked: true` flag:
       ```typescript
       const response = await linkTelegramCode();
       if (response.alreadyLinked) {
         toast.success('Ваш аккаунт уже связан с Telegram.');
         await refreshUser(); // Immediately update UI
         return;
       }
       ```

    2. For new code generation, ensure toast says:
       ```typescript
       toast.success('Код получен. Перейдите в бот.', {
         style: { backgroundColor: '#0a192f', color: 'white' }
       });
       ```

    3. Call refreshUser() immediately after detecting alreadyLinked to update the UI state

    4. Import refreshUser from AuthContext:
       ```typescript
       const { refreshUser } = useAuth();
       ```

    Reference existing handleGenerateTelegramLink implementations in Settings.tsx (around line 120) and System.tsx (around line 130).
  </action>
  <verify>
    Generate a Telegram link when already linked - should see "Ваш аккаунт уже связан с Telegram." toast and UI should immediately show connected state
  </verify>
  <done>
    Telegram link button handles alreadyLinked response with appropriate toast and immediate UI refresh
  </done>
</task>

<task type="auto">
  <name>Task 2: Force demo shift state updates on start/end</name>
  <files>src/views/Dashboard.tsx, src/views/DriverView.tsx</files>
  <action>
    Make demo mode (tenant 999) feel realistic with immediate state forcing:

    1. In Dashboard.tsx or DriverView.tsx, update handleStartShift for demo mode:
       ```typescript
       const handleStartShift = async () => {
         if (user?.tenant_id === 999) {
           // Demo mode: force state update
           const mockShift = {
             id: 999,
             status: 'active',
             start_time: new Date().toISOString(),
             truck: { id: 1, name: 'MAN TGX', plate_number: 'А123БВ' },
             site: { id: 1, name: 'ЖК Северный', address: 'ул. Примерная, 1' }
           };
           setActiveShift(mockShift);
           localStorage.setItem('logishift_active_shift', JSON.stringify(mockShift));

           // Update user state to active
           const updatedUser = { ...user, current_state: 'active' };
           localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));

           toast.success('✅ Смена началась');
           return;
         }

         // Production mode: normal API call
         // ... existing code
       };
       ```

    2. Update handleEndShift for demo mode:
       ```typescript
       const handleEndShift = async () => {
         if (user?.tenant_id === 999) {
           // Demo mode: force state update
           setActiveShift(null);
           localStorage.removeItem('logishift_active_shift');

           // Update user state back to idle
           const updatedUser = { ...user, current_state: 'idle' };
           localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));

           // Show shift summary mock
           toast.success('✅ Смена завершена');
           setShowSummary(true);
           return;
         }

         // Production mode: normal API call
         // ... existing code
       };
       ```

    3. Ensure these updates trigger UI to switch from "Selection" to "Active Shift" screen with timer

    Reference existing shift handling code in Dashboard.tsx or DriverView.tsx.
  </action>
  <verify>
    In demo mode (999), click "Open Shift" - should immediately show active shift screen with timer. Click "End Shift" - should show shift summary.
  </verify>
  <done>
    Demo mode (999) forces immediate state updates with mock shift objects, creating realistic experience
  </done>
</task>

<task type="auto">
  <name>Task 3: Isolate sidebar in demo driver mode</name>
  <files>src/components/Layout.tsx</files>
  <action>
    Hide admin tabs when in demo driver mode (tenant_id === 999 AND demoView === 'driver'):

    1. Define which tabs to hide:
       - Analytics
       - Registry
       - Personnel
       - Fleet
       - Objects
       - Audit
       - System

    2. Update sidebar rendering logic:
       ```typescript
       const shouldHideAdminTabs = user?.tenant_id === 999 && demoPersona === 'driver';

       // When filtering tabs:
       const visibleMainItems = shouldHideAdminTabs
         ? mainItems.filter(item => item.id === 'dashboard')
         : mainItems;

       const visibleAdminItems = shouldHideAdminTabs
         ? []
         : adminItems;

       // Update Dashboard label for demo driver mode
       const getDashboardLabel = () => {
         return shouldHideAdminTabs ? 'Приложение водителя' : 'Дашборд';
       };
       ```

    3. Ensure Admin/Driver toggle button remains visible:
       - The persona switcher section should NOT be filtered
       - Keep it at the bottom of sidebar

    4. Update the Sidebar component to use filtered lists:
       ```typescript
       {visibleMainItems.map(item => ...)}
       {visibleAdminItems.map(item => ...)}
       ```

    Reference existing sidebar rendering in Layout.tsx (around lines 180-250).
  </action>
  <verify>
    Switch to demo driver mode (999 + driver persona) - sidebar should only show "Приложение водителя" tab and persona switcher. All other tabs hidden.
  </verify>
  <done>
    Demo driver mode shows isolated sidebar with only Dashboard (labeled "Приложение водителя") and persona switcher
  </done>
</task>

<task type="auto">
  <name>Task 4: Apply Navy-900 theme to all toasts and buttons</name>
  <files>src/views/Dashboard.tsx, src/views/DriverView.tsx, src/components/*.tsx</files>
  <action>
    Ensure Navy-900 theme consistency for toasts and buttons:

    1. Update all toast calls to use Navy-900 styling:
       ```typescript
       toast.success('message', {
         style: {
           backgroundColor: '#0a192f',
           color: 'white',
           border: '1px solid #1e293b'
         }
       });
       ```

    2. Find and update "Open Shift" blue button to Navy-900:
       - Search for: `bg-blue-600`, `bg-indigo-600`, `bg-blue-500`
       - Replace with: `bg-[#0a192f] hover:bg-[#152238]`
       - Likely in Dashboard.tsx or DriverView.tsx

    3. Global check with grep:
       ```bash
       grep -rn "bg-blue-600\|bg-indigo-600" src/views/ src/components/
       ```
       Replace any found with Navy-900 equivalent.

    4. Ensure toast container (if using sonner or similar) uses Navy-900:
       - Check toast provider configuration
       - Update default toast styles if needed

    Reference existing button styling in Dashboard.tsx and DriverView.tsx.
  </action>
  <verify>
    grep -rn "bg-blue-600\|bg-indigo-600" src/ returns no results. All toasts appear with Navy-900 background.
  </verify>
  <done>
    All toasts use Navy-900 styling (#0a192f), Open Shift button uses Navy-900 background, no blue/indigo remains
  </done>
</task>

</tasks>

<verification>
1. Test Telegram alreadyLinked: Generate link when already linked - see "Ваш аккаунт уже связан с Telegram." toast
2. Test demo shift start: In demo mode, click Open Shift - immediate state change to active with mock data
3. Test demo shift end: Click End Shift - immediate state change to null with summary
4. Test sidebar isolation: Demo driver mode shows only Dashboard + Switcher
5. Test theme: All toasts and buttons use Navy-900 (#0a192f)
</verification>

<success_criteria>
- Telegram link handles alreadyLinked with appropriate toast and immediate refreshUser()
- Demo mode forces realistic state transitions on shift start/end
- Demo driver mode sidebar shows only Dashboard (labeled "Приложение водителя") + Switcher
- All toasts use Navy-900 styling
- Open Shift button uses Navy-900 background
- No blue/indigo colors remain in UI
</success_criteria>

<output>
After completion, create `.planning/quick/4-deep-integration-telegram-interaction-fi/4-SUMMARY.md`
</output>
