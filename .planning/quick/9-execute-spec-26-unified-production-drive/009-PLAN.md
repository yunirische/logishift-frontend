---
phase: quick
plan: 009
type: execute
wave: 1
depends_on: []
files_modified: [src/components/Dashboard.tsx]
autonomous: true
must_haves:
  truths:
    - "Dead renderDriverUI() function removed from Dashboard.tsx"
    - "Unreachable fallback return statement removed from Dashboard.tsx"
    - "No functional changes - only dead code removal"
    - "Admin view logic in Dashboard.tsx remains functional"
    - "Driver view continues to use DriverView component"
  artifacts:
    - path: "src/components/Dashboard.tsx"
      provides: "Admin dashboard for FOREMAN/ADMIN roles"
      contains: "isAdminView"
    - path: "src/views/DriverView.tsx"
      provides: "Driver UI - single source of truth"
      contains: "export const DriverView"
  key_links:
    - from: "src/components/Dashboard.tsx"
      to: "src/views/DriverView.tsx"
      via: "import { DriverView }"
      pattern: "from.*DriverView"
---

<objective>
Execute Spec #26: Unified Production Driver UI and Stats Fix - Remove dead code

Purpose: Clean up dead code from Dashboard.tsx after quick-007 unified driver UI to use DriverView component
Output: Streamlined Dashboard.tsx with only active admin view logic
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/7-fix-dashboard-stats-unify-driver-ui-refi/007-PLAN.md

# Reference files
@src/components/Dashboard.tsx
@src/views/DriverView.tsx
@src/views/AdminView.tsx
</context>

<tasks>

<task type="auto">
  <name>Remove dead renderDriverUI() function and unreachable fallback from Dashboard.tsx</name>
  <files>src/components/Dashboard.tsx</files>
  <action>
    Remove the following dead code from Dashboard.tsx:

    1. Delete the entire `renderDriverUI()` function (lines 427-720) - this function is never called since quick-007 unified driver UI to use DriverView component

    2. Delete the unreachable fallback return statement (lines 722-759) that calls `{renderDriverUI()}` - this code is unreachable because:
       - Admin view returns early at line 416
       - Driver view returns at line 423 with <DriverView />

    3. Remove unused imports that were only used by the deleted code (if any):
       - Check if: Moon, Rocket, ArrowRight, Camera, Flag imports are still used
       - Keep: Clock, Truck, Hand, Plus, User, Building2 (used by admin view)

    4. After deletion, the Dashboard component should end at line 423 with:
       ```tsx
       if (!isAdminView) {
         return <DriverView />;
       }
       ```
       And the admin view should end at line 416 with the closing div.

    DO NOT modify:
    - Admin view logic (lines 275-416) - keep functional
    - Driver view redirect (lines 419-423) - keep using DriverView
    - State management and hooks
    - Stats API handling (already fixed in quick-007)
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    Dead code removed, build passes, Dashboard.tsx reduced by ~340 lines
  </done>
</task>

<task type="auto">
  <name>Verify stats handling consistency between Dashboard.tsx and AdminView.tsx</name>
  <files>src/components/Dashboard.tsx, src/views/AdminView.tsx</files>
  <action>
    1. Check stats API response handling in Dashboard.tsx (lines 232-247) - should use direct response `res.activeShifts`, not `res.data.activeShifts`

    2. Check stats API response handling in AdminView.tsx (lines 14-26) - should use direct response `statsRes`, not `statsRes.data`

    3. Both should be consistent after quick-007 fix which changed api.get() to return data directly (not axios-style .data wrapper)

    If any inconsistency found, update to use direct response pattern (no .data access)

    The custom api.get() wrapper already extracts data, so `res` IS the data object.
  </action>
  <verify>grep -n "res\\.data\\.activeShifts\|statsRes\\.data" src/components/Dashboard.tsx src/views/AdminView.tsx || echo "No .data access found - good"</verify>
  <done>
    Stats handling verified consistent - both use direct response pattern
  </done>
</task>

<task type="auto">
  <name>Document current admin UI architecture in task summary</name>
  <files>.planning/quick/9-execute-spec-26-unified-production-drive/009-SUMMARY.md</files>
  <action>
    Create SUMMARY.md documenting:

    1. Dashboard.tsx now serves as role-based router:
       - FOREMAN/ADMIN: Shows embedded admin view with usage limits, manual shift creation, active shifts details
       - DRIVER: Redirects to DriverView component

    2. AdminView.tsx is a standalone component but NOT currently used by Dashboard.tsx
       - Dashboard.tsx admin section has more features (usage limits, manual shift modal)
       - Consider consolidating in future: either use AdminView.tsx or move its features to Dashboard.tsx

    3. DriverView.tsx is the single source of truth for driver UI

    4. No functional changes in this task - only dead code removal

    Include line counts before/after for Dashboard.tsx
  </action>
  <verify>test -f .planning/quick/9-execute-spec-26-unified-production-drive/009-SUMMARY.md</verify>
  <done>
    Summary created with architecture documentation and line count reduction
  </done>
</task>

</tasks>

<verification>
- Dashboard.tsx compiles without errors
- Build completes successfully
- Admin view remains functional for FOREMAN/ADMIN roles
- Driver view still uses DriverView component
- No .data access on stats API responses
- Approximately 340 lines removed from Dashboard.tsx
</verification>

<success_criteria>
- Dead renderDriverUI() function removed
- Unreachable fallback return removed
- Build passes
- Summary document created
</success_criteria>

<output>
After completion, create `.planning/quick/9-execute-spec-26-unified-production-drive/009-SUMMARY.md`
</output>
