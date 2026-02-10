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
  - src/views/DriverView.tsx
autonomous: true

must_haves:
  truths:
    - "Telegram connection is detected within 5 seconds after returning from bot (not just on window focus)"
    - "Demo state machine resets when switching personas (admin -> driver -> admin)"
    - "Sidebar closes automatically when switching demo personas"
  artifacts:
    - path: "src/components/System.tsx"
      provides: "Enhanced Telegram linking with polling detection"
      exports: ["handleGenerateTelegramLink", "openTelegramBot"]
    - path: "src/components/Settings.tsx"
      provides: "Enhanced Telegram linking with polling detection"
      exports: ["handleGenerateTelegramLink", "openTelegramBot"]
    - path: "src/components/Layout.tsx"
      provides: "Sidebar state reset on persona switch"
      exports: ["Layout"]
    - path: "src/views/DriverView.tsx"
      provides: "Demo state reset on persona switch"
      exports: ["DriverView"]
  key_links:
    - from: "src/components/Layout.tsx"
      to: "localStorage['logishift_demo_persona']"
      via: "handlePersonaSwitch sets demo persona flag"
      pattern: "localStorage.*demo.*persona"
    - from: "src/views/DriverView.tsx"
      to: "localStorage['logishift_demo_persona']"
      via: "useEffect watches demo persona changes"
      pattern: "demo_persona"
---

<objective>
Deep integration: Telegram interaction fix, demo state machine realism, sidebar isolation

Purpose: Improve Telegram linking UX reliability, ensure demo mode feels realistic when switching personas, and prevent UI state leaking between personas
Output: Enhanced Telegram connection detection, isolated demo state per persona, clean sidebar transitions
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
@src/views/DriverView.tsx
@src/types.ts
@src/constants.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enhance Telegram connection detection with polling</name>
  <files>src/components/System.tsx, src/components/Settings.tsx</files>
  <action>
    In both System.tsx and Settings.tsx, enhance the Telegram linking flow:

    1. Replace the window focus listener approach with a polling-based detection:
       - After calling openTelegramBot(), start a 30-second interval (every 2 seconds)
       - Each interval calls refreshUser() to check if tg_user_id is now set
       - If tg_user_id exists, clear interval and show success message
       - Clear interval on component unmount

    2. Update the openTelegramBot function to:
       - Store the polling interval ID in a ref (const pollingRef = useRef<NodeJS.Timeout | null>(null))
       - Start polling immediately after opening the bot window

    3. Clear any existing polling when:
       - Component unmounts (useEffect cleanup)
       - User manually generates a new link code
       - Connection is detected (tg_user_id becomes truthy)

    4. Show a subtle "Checking connection..." indicator during polling

    Reference existing code in System.tsx lines 123-136 and Settings.tsx lines 115-128 for the current focus listener implementation.
  </action>
  <verify>
    Open browser DevTools Network tab, click "Связать с Telegram", observe that /users/me API is called every 2 seconds until connection is detected
  </verify>
  <done>
    Telegram connection is detected within 5 seconds after user returns from bot, even without clicking back to the tab first
  </done>
</task>

<task type="auto">
  <name>Task 2: Isolate sidebar state and add demo persona tracking</name>
  <files>src/components/Layout.tsx</files>
  <action>
    In Layout.tsx, add demo persona state tracking and isolate sidebar behavior:

    1. Add a localStorage key to track current demo persona:
       - In handlePersonaSwitch, save the new persona: localStorage.setItem('logishift_demo_persona', newPersona)
       - Close sidebar after switch: setSidebarOpen(false)

    2. Add useEffect to watch for persona changes from other components:
       - Listen for storage event (for cross-tab sync) or custom event
       - When persona changes externally, update local state and close sidebar

    3. Reset sidebar state when persona changes:
       - In handlePersonaSwitch, ensure setSidebarOpen(false) is called AFTER setDemoPersona

    Reference existing handlePersonaSwitch at lines 43-48 and sidebar state management at line 41.
  </action>
  <verify>
    1. Switch from Admin to Driver persona - sidebar should close automatically
    2. Open sidebar in Driver mode, switch back to Admin - sidebar should close
  </verify>
  <done>
    Sidebar always closes when switching personas, preventing state leakage between admin and driver modes
  </done>
</task>

<task type="auto">
  <name>Task 3: Reset demo state machine on persona switch</name>
  <files>src/views/DriverView.tsx</files>
  <action>
    In DriverView.tsx, add demo state reset when persona switches:

    1. Add a useEffect that watches for demo persona changes:
       ```typescript
       useEffect(() => {
         const handlePersonaChange = () => {
           const currentPersona = localStorage.getItem('logishift_demo_persona');
           // Reset demo state when switching to this view or persona changes
           if (user?.tenant_id === 999) {
             setActiveShift(null);
             setSelectedTruck('');
             setSelectedSite('');
             // Reset local storage user state to idle
             const resetUser = { ...user, current_state: DriverState.IDLE };
             localStorage.setItem('logishift_user_info', JSON.stringify(resetUser));
             initData();
           }
         };

         window.addEventListener('storage', handlePersonaChange);
         return () => window.removeEventListener('storage', handlePersonaChange);
       }, [user]);
       ```

    2. Also reset state on component mount if in demo mode and current_state is not IDLE:
       - This ensures that when user switches to Driver persona, they start fresh

    Reference existing demo mode logic at lines 75-94 and state machine transitions at lines 143-158.

    IMPORTANT: The state machine should only reset when:
    - Switching FROM admin TO driver persona
    - NOT during normal demo usage (completing shift steps should still work)
  </action>
  <verify>
    1. In demo mode, start a shift as Driver (click Open Shift)
    2. Switch to Admin persona
    3. Switch back to Driver persona
    4. Driver view should show "Select truck/site" screen (idle state), not the active shift
  </verify>
  <done>
    Demo state machine resets to idle when switching personas, giving each demo session a clean slate
  </done>
</task>

</tasks>

<verification>
1. Test Telegram linking: Generate link, open bot, complete linking in Telegram, observe auto-detection within 5 seconds
2. Test persona isolation: Start demo shift as driver, switch to admin, switch back - driver view should be idle
3. Test sidebar behavior: Switch personas with sidebar open - sidebar should close in new persona
</verification>

<success_criteria>
- Telegram connection polling detects link within 5 seconds of bot completion
- Demo state resets when switching personas (no carryover state)
- Sidebar closes automatically on persona switch
- All changes work in both production mode (tenant_id !== 999) and demo mode (tenant_id === 999)
</success_criteria>

<output>
After completion, create `.planning/quick/4-deep-integration-telegram-interaction-fi/quick-004-SUMMARY.md`
</output>
