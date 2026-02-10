---
phase: quick
plan: 6
type: execute
wave: 1
depends_on: []
files_modified:
  - src/views/DriverView.tsx
  - src/components/Dashboard.tsx
  - src/context/AuthContext.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Driver view state stays synced with API after actions (start/end/upload)"
    - "Demo mode actions update localStorage and UI state consistently"
    - "User quota usage displays correctly in Settings page"
    - "No crashes when navigation between driver/admin views in demo mode"
    - "Visual hierarchy is professional with proper spacing and typography"
  artifacts:
    - path: "src/views/DriverView.tsx"
      provides: "Professional mobile-first driver interface"
      min_lines: 200
    - path: "src/components/Dashboard.tsx"
      provides: "Admin dashboard with state sync recovery"
      contains: "refreshStatus"
    - path: "src/context/AuthContext.tsx"
      provides: "User state management with quota display"
      exports: ["useAuth", "refreshUser"]
  key_links:
    - from: "src/views/DriverView.tsx"
      to: "src/services/api"
      via: "getCurrentShift, api.post"
      pattern: "getCurrentShift|api\\.post"
    - from: "src/components/Dashboard.tsx"
      to: "localStorage"
      via: "api.setUserInfo"
      pattern: "setUserInfo"
    - from: "src/context/AuthContext.tsx"
      to: "localStorage"
      via: "setUserInfo, getUserInfo"
      pattern: "localStorage\\.(get|set)Item"
---

<objective>
Driver UX Overhaul & Final Sync: Fix state sync crashes, professional driver view polish, demo mode consistency, and visual cleanup.

Purpose: The driver view has state synchronization issues where actions don't properly update the UI, demo mode state can become inconsistent, and visual hierarchy needs improvement. This plan ensures reliable state management and a professional mobile experience.

Output: Robust driver view with proper state sync, polished mobile UI, consistent demo mode behavior, and fixed quota display.
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/views/DriverView.tsx
@src/components/Dashboard.tsx
@src/context/AuthContext.tsx
@src/types.ts
@src/services/api.ts

Recent context from quick-005: Added 404 fallback to refreshUser, Settings quota display using Promise.all pattern.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Driver View State Sync & Refresh After Actions</name>
  <files>src/views/DriverView.tsx</files>
  <action>
    Fix state synchronization in DriverView.tsx:

    1. Add state refresh after each action:
       - After handleStart: re-fetch current shift and update user state
       - After handleEnd: clear shift state and reset user to IDLE
       - After handleFileUpload: advance state machine and re-fetch shift

    2. Replace direct localStorage manipulation with AuthContext.refreshUser():
       - Remove: localStorage.setItem('logishift_user_info', ...)
       - Add: await refreshUser() after each action

    3. Add proper error boundaries:
       - Wrap API calls in try/catch with user-friendly error messages
       - Show toast on error (not alert)

    4. Fix demo mode state consistency:
       - Ensure mock shift object is stored in consistent format
       - Update user.current_state synchronously with localStorage

    5. Remove duplicate state management:
       - Use AuthContext.user as single source of truth
       - Remove local user state if redundant

    Do NOT change the visual layout - only fix sync logic.
  </action>
  <verify>
    - Demo mode: Start shift -> shows "active" state -> end shift -> returns to idle
    - Production: Actions trigger API calls and UI updates correctly
    - No console errors during state transitions
    - Toast notifications appear for all actions
  </verify>
  <done>
    State sync works reliably in both demo and production modes. Actions update UI immediately without page reload. No state drift between API and localStorage.
  </done>
</task>

<task type="auto">
  <name>Task 2: Polish Driver View Visual Hierarchy & Mobile UX</name>
  <files>src/views/DriverView.tsx</files>
  <action>
    Improve visual hierarchy in DriverView.tsx:

    1. Header section:
       - Increase font sizes for better readability
       - Add proper spacing between name and status badge
       - Use Navy-900 (#0a192f) for primary actions

    2. Selection cards (truck/site):
       - Add subtle shadow on selection state
       - Increase touch targets (min 44px height)
       - Add visual feedback (scale, color transition)
       - Show truck plate number more prominently

    3. Active shift display:
       - Make time display larger and more readable
       - Add proper icon/label pairing for truck/site info
       - Show photo requirements badges more clearly

    4. Action buttons:
       - Make "Start Shift" button more prominent (larger, bolder)
       - Use consistent color: Navy-900 for primary, red for destructive
       - Add proper loading states with spinner

    5. Toast notifications:
       - Position at bottom-20 (avoid keyboard overlap)
       - Add subtle animation (fade-in, slide-up)
       - Auto-dismiss after 2 seconds

    6. Remove visual clutter:
       - Remove duplicate labels where icons are self-explanatory
       - Use consistent spacing (4px increments)
       - Remove unnecessary borders/shadows

    Use existing design tokens from Dashboard.tsx as reference.
  </action>
  <verify>
    - Visual hierarchy follows: Title > Section headers > Card content > Labels
    - Touch targets are at least 44x44px
    - Primary action (Start Shift) is most prominent element
    - Status badges use consistent colors (green=active, gray=idle, amber=demo)
  </verify>
  <done>
    Driver view has professional mobile-first design with clear visual hierarchy. All actions are discoverable and touch-friendly.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix Quota Sync in Settings & Dashboard Recovery State</name>
  <files>src/components/Dashboard.tsx src/components/Settings.tsx</files>
  <action>
    Fix quota usage display and state recovery:

    1. In Dashboard.tsx - Fix state recovery logic:
       - Remove needsRecovery state (already handled by refreshStatus)
       - Simplify shift check to handle 400/404 gracefully
       - Ensure currentUser.current_state is synced with API response

    2. In Dashboard.tsx - Clean up unused state:
       - Remove step state if not used in admin view
       - Consolidate loading states (loading, isActionLoading, shiftCheckComplete)

    3. In Settings.tsx - Ensure quota data loads reliably:
       - Check that getAnalyticsUsage is called with proper error handling
       - Display loading skeleton while fetching
       - Show empty state if API returns 404

    4. Add quota sync to AuthContext:
       - After login/refresh, fetch usage data in parallel
       - Store usage data in context for Settings access

    Use the pattern from quick-005: Promise.all for parallel data fetching.
  </action>
  <verify>
    - Settings page shows quota usage without errors
    - Dashboard state recovery doesn't show unnecessary UI
    - Parallel fetching works (both user and usage load together)
    - No crash when navigating to Settings with no quota data
  </verify>
  <done>
    Quota usage displays correctly in Settings. State recovery is seamless without unnecessary loading states. No crashes on navigation.
  </done>
</task>

</tasks>

<verification>
After completing all tasks:

1. State Sync Test:
   - Open demo mode, start shift, verify state changes to "active"
   - Upload photo, verify state advances correctly
   - End shift, verify state returns to "idle"

2. Visual Test:
   - Check mobile view (375px width) - all elements should be readable
   - Verify touch targets are large enough
   - Check color contrast meets accessibility standards

3. Integration Test:
   - Switch between admin and driver personas in demo mode
   - Navigate to Settings - quota should display
   - No console errors during navigation

4. Edge Cases:
   - Try actions while offline (should show error, not crash)
   - Rapid-fire button clicks (should debounce/ignore duplicates)
</verification>

<success_criteria>
- Driver view state remains consistent with API after all actions
- Demo mode state transitions work smoothly without drift
- Settings page displays quota usage correctly
- Visual hierarchy is professional and mobile-friendly
- No crashes or console errors during normal usage
</success_criteria>

<output>
After completion, create `.planning/quick/6-driver-ux-overhaul-final-sync-fix-crash-/6-SUMMARY.md`
</output>
