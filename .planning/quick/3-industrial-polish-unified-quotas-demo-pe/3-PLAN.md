---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/System.tsx
  - src/components/Settings.tsx
  - src/components/Layout.tsx
  - src/pages/DriverView.tsx
  - src/services/api.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Settings uses real-time /api/v1/analytics/usage for quota display"
    - "Demo mode hides all Admin tabs except Dashboard and Switcher"
    - "DriverView shows success toasts and advances state machine on demo actions"
    - "Telegram card uses Navy-900 gradient instead of blue"
    - "Sidebar shows 'v2.5 Stable' version"
  artifacts:
    - path: "src/components/Settings.tsx"
      provides: "Real-time quota usage from analytics API"
      contains: "getAnalyticsUsage"
    - path: "src/components/Layout.tsx"
      provides: "Conditional tab rendering for demo mode"
      contains: "demoPersona.*admin tabs"
    - path: "src/pages/DriverView.tsx"
      provides: "Demo action feedback with toasts and state transitions"
      contains: "toast.*success.*demo"
  key_links:
    - from: "src/components/Settings.tsx"
      to: "api.ts"
      via: "getAnalyticsUsage API call"
      pattern: "getAnalyticsUsage"
    - from: "src/pages/DriverView.tsx"
      to: "ui/toast"
      via: "Success notifications"
      pattern: "toast.*success"
---

<objective>
Industrial polish: unified quota data source, demo persona switcher with sidebar filtering, interactive demo feedback, Navy-900 theme consistency.

Purpose: Fix quota data discrepancies, refine demo mode UX, ensure theme consistency across all components.

Output: Unified data source, polished demo mode with hidden admin tabs, interactive feedback, consistent Navy-900 branding.
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
@src/pages/DriverView.tsx
@src/services/api.ts
@src/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Unify quota data source in Settings.tsx</name>
  <files>src/components/Settings.tsx, src/services/api.ts</files>
  <action>
    Fix the quota data discrepancy by using real-time analytics data instead of static tenant info:

    1. In `src/services/api.ts`:
       - Ensure `getAnalyticsUsage()` function exists and calls `GET /api/v1/analytics/usage`
       - Returns usage data with trucks, drivers, sites counts

    2. In `src/components/Settings.tsx`:
       - Add state for analytics usage: `const [usage, setUsage] = useState<UsageData | null>(null)`
       - Add useEffect to fetch analytics usage on mount:
         ```typescript
         useEffect(() => {
           const fetchUsage = async () => {
             try {
               const data = await getAnalyticsUsage();
               setUsage(data);
             } catch (error) {
               console.error('Failed to fetch usage:', error);
             }
           };
           fetchUsage();
         }, []);
         ```
       - Replace static tenant.quota_trucks with `usage?.trucks?.count || 0`
       - Replace static tenant.quota_drivers with `usage?.drivers?.count || 0`
       - Replace static tenant.quota_sites with `usage?.sites?.count || 0`
       - Keep limits from tenant.quota_trucks_max, etc.

    This ensures Settings shows the same real-time data as Analytics dashboard.
  </action>
  <verify>Settings.tsx shows usage counts from analytics API matching Analytics dashboard</verify>
  <done>Quota display uses real-time /api/v1/analytics/usage data source</done>
</task>

<task type="auto">
  <name>Task 2: Implement demo persona sidebar logic in Layout.tsx</name>
  <files>src/components/Layout.tsx</files>
  <action>
    Hide Admin tabs when in Driver View (Demo Mode):

    1. Define admin tab list that should be hidden in demo mode:
       - Analytics
       - Registry
       - Personnel
       - Fleet
       - Objects
       - System

    2. Modify sidebar rendering logic:
       - When `demoPersona === 'driver'`, only render:
         * Dashboard tab (renders DriverView)
         * Demo Persona Switcher section
       - When `demoPersona === 'admin'`, render all tabs normally

    3. Style the Switcher button properly:
       - Background: `bg-[#0a192f]` (Navy-900)
       - Text/border: `text-amber-500 border-amber-500`
       - Font: `font-mono` (JetBrains Mono)
       - Size: Proportionate to other sidebar buttons
       - Prevent overlap with Logout on small screens (add margin-bottom)

    4. Update version label to "v2.5 Stable"

    Implementation approach:
    ```typescript
    const adminTabs = ['analytics', 'registry', 'personnel', 'fleet', 'objects', 'system'];

    // In sidebar render:
    {demoPersona === 'driver' ? (
      // Only show Dashboard + Switcher
    ) : (
      // Show all tabs including admin tabs
    )}
    ```
  </action>
  <verify>When demoPersona='driver', only Dashboard and Switcher are visible in sidebar</verify>
  <done>Demo mode hides Admin tabs, shows only Dashboard and Persona Switcher</done>
</task>

<task type="auto">
  <name>Task 3: Add interactive feedback to DriverView.tsx demo actions</name>
  <files>src/pages/DriverView.tsx</files>
  <action>
    Add success toasts and state transitions for demo actions (tenant 999):

    1. When user performs a demo action (e.g., start shift, upload photo):
       - Check if tenant_id is 999 (demo mode)
       - If demo action succeeds:
         * Show success toast: "✅ Действие выполнено"
         * Manually advance state machine to next step
         * Example: if currentState is 'idle', set to 'awaiting_odo_start'

    2. Use toast from UI library:
       ```typescript
       import { toast } from 'sonner' or similar

       const handleDemoAction = async () => {
         // ... perform action
         if (user.tenant_id === 999) {
           toast.success('✅ Действие выполнено');
           setCurrentState(nextState);
         }
       };
       ```

    3. Ensure state transitions follow the shift state machine:
       - idle → awaiting_odo_start
       - awaiting_odo_start → active
       - active → awaiting_odo_end
       - awaiting_odo_end → awaiting_invoice
       - awaiting_invoice → finished

    This provides immediate feedback and simulates realistic workflow progression.
  </action>
  <verify>Demo actions show success toast and advance state machine correctly</verify>
  <done>DriverView demo actions provide interactive feedback with toasts and state transitions</done>
</task>

<task type="auto">
  <name>Task 4: Apply Navy-900 theme to Telegram card and verify consistency</name>
  <files>src/components/System.tsx, src/components/Settings.tsx</files>
  <action>
    Ensure Navy-900 theme consistency:

    1. In System.tsx Telegram card:
       - Change header gradient from blue to Navy-900:
         `from-[#0a192f] to-[#1e293b]`
       - Remove any remaining `bg-indigo-600` or `text-indigo-600`
       - Keep Telegram brand colors for the icon/logo only

    2. Global check (use grep):
       - Search for any remaining `bg-indigo-600` in components
       - Search for any remaining `text-indigo-600` in components
       - Replace with Navy-900 equivalents:
         * `bg-indigo-600` → `bg-[#0a192f]`
         * `text-indigo-600` → `text-[#0a192f]`
         * `hover:bg-indigo-700` → `hover:bg-[#152238]`

    3. Update sidebar version in Layout.tsx:
       - Ensure version displays as "v2.5 Stable"

    This completes the "Navy-900 Rule" - all branding uses consistent industrial navy palette.
  </action>
  <verify>grep -r "indigo-600" src/components/ returns no results (except comments)</verify>
  <done>All components use Navy-900 theme, Telegram card updated, no indigo-600 remains</done>
</task>

</tasks>

<verification>
1. Settings quota counts match Analytics dashboard (real-time data source)
2. Demo mode (driver persona) hides all Admin tabs from sidebar
3. DriverView demo actions show success toasts and advance state machine
4. Telegram card uses Navy-900 gradient instead of blue
5. No indigo-600 colors remain in components
6. Sidebar shows "v2.5 Stable" version
7. Persona Switcher button doesn't overlap with Logout on mobile
</verification>

<success_criteria>
- Quota data unified between Settings and Analytics views
- Demo mode provides focused driver-only experience
- Demo actions have clear visual feedback
- Navy-900 theme is 100% consistent across all components
- Version label correctly shows "v2.5 Stable"
</success_criteria>

<output>
After completion, create `.planning/quick/3-industrial-polish-unified-quotas-demo-pe/3-SUMMARY.md`
</output>
